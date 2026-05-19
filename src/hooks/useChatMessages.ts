import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { QueryKeys, RealtimeChannels } from '@/lib/constants';
import { mapMessageToVM, type ChatMessageVM } from '@/lib/chat-types';
import type { SenderRole } from '@/types/database';

// ─── Messages query + realtime ────────────────────────────────────────────────

export function useChatMessages(threadId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QueryKeys.chatMessages(threadId ?? ''),
    queryFn: async (): Promise<ChatMessageVM[]> => {
      if (!threadId) return [];

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []).map(mapMessageToVM);
    },
    enabled: !!threadId,
    staleTime: 0, // Always fresh for chat
  });

  // Realtime subscription for this thread
  useEffect(() => {
    if (!threadId) return;

    const channel = supabase
      .channel(RealtimeChannels.chatThread(threadId))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const newMsg = mapMessageToVM(payload.new as any);
          queryClient.setQueryData<ChatMessageVM[]>(
            QueryKeys.chatMessages(threadId),
            (prev) => [...(prev ?? []), newMsg]
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [threadId, queryClient]);

  return query;
}

// ─── Send message ─────────────────────────────────────────────────────────────

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      threadId,
      senderUserId,
      body,
      imagePath,
    }: {
      threadId: string;
      senderUserId: string;
      body: string | null;
      imagePath: string | null;
    }) => {
      // 1. Insert message
      const { data: msg, error: msgError } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: threadId,
          sender_user_id: senderUserId,
          sender_role: 'educator' as SenderRole,
          body,
          image_path: imagePath,
        })
        .select()
        .single();

      if (msgError) throw new Error(msgError.message);

      // 2. Update thread preview
      const preview = body
        ? body.slice(0, 80)
        : '📷 Photo';

      await supabase
        .from('chat_threads')
        .update({
          last_message_at: msg.created_at,
          last_message_preview: preview,
        })
        .eq('id', threadId);

      return msg;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.chatMessages(variables.threadId),
      });
    },
  });
}

// ─── Mark thread as read ──────────────────────────────────────────────────────

export function useMarkThreadRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      threadId,
      userId,
    }: {
      threadId: string;
      userId: string;
    }) => {
      await supabase.from('chat_thread_reads').upsert(
        { thread_id: threadId, user_id: userId, last_read_at: new Date().toISOString() },
        { onConflict: 'thread_id,user_id' }
      );
    },
    onSuccess: (_data, variables) => {
      // Refresh unread counts
      queryClient.invalidateQueries({ queryKey: ['chat_unread_total'] });
      queryClient.invalidateQueries({ queryKey: ['chat_threads'] });
    },
  });
}

// ─── Find or create thread ────────────────────────────────────────────────────

export async function findOrCreateThread({
  childId,
  educatorUserId,
  parentUserId,
  teacherLinkId,
}: {
  childId: string;
  educatorUserId: string;
  parentUserId: string;
  teacherLinkId: string;
}): Promise<string> {
  // Try to find existing thread by teacher_link_id (per spec §9)
  const { data: existing } = await supabase
    .from('chat_threads')
    .select('id')
    .eq('teacher_link_id', teacherLinkId)
    .maybeSingle();

  if (existing) return existing.id;

  // Create new thread
  const { data: created, error } = await supabase
    .from('chat_threads')
    .insert({
      child_id: childId,
      teacher_link_id: teacherLinkId,
      parent_user_id: parentUserId,
      educator_user_id: educatorUserId,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return created.id;
}

// ─── Search approved students for new chat ────────────────────────────────────
// Spec §9: must union educator_students + child_teacher_links

export interface ChatStudentResult {
  childId: string;
  name: string;
  nameHi: string | null;
  avatarUrl: string | null;
  parentUserId: string;
  teacherLinkId: string;
}

export async function searchChatStudents(
  educatorId: string
): Promise<ChatStudentResult[]> {
  // Source 1: educator_students
  const { data: esData } = await supabase
    .from('educator_students')
    .select(`
      child_id,
      children ( pet_name, pet_name_hi, avatar_url, parent_user_id )
    `)
    .eq('educator_id', educatorId)
    .eq('approval_status', 'approved');

  // Source 2: child_teacher_links
  const { data: ctlData } = await supabase
    .from('child_teacher_links')
    .select(`
      id,
      child_id,
      parent_user_id,
      children ( pet_name, pet_name_hi, avatar_url )
    `)
    .eq('educator_id', educatorId)
    .eq('approval_status', 'approved');

  const seen = new Set<string>();
  const results: ChatStudentResult[] = [];

  // From child_teacher_links first (has teacherLinkId directly)
  for (const row of ctlData ?? []) {
    if (seen.has(row.child_id)) continue;
    seen.add(row.child_id);
    const child = (row as any).children;
    results.push({
      childId: row.child_id,
      name: child?.pet_name ?? 'Unknown',
      nameHi: child?.pet_name_hi ?? null,
      avatarUrl: child?.avatar_url ?? null,
      parentUserId: row.parent_user_id,
      teacherLinkId: row.id,
    });
  }

  // From educator_students (need to look up teacherLinkId)
  for (const row of esData ?? []) {
    if (seen.has(row.child_id)) continue;
    seen.add(row.child_id);
    const child = (row as any).children;

    // Find the corresponding child_teacher_links row
    const { data: ctl } = await supabase
      .from('child_teacher_links')
      .select('id, parent_user_id')
      .eq('educator_id', educatorId)
      .eq('child_id', row.child_id)
      .maybeSingle();

    if (!ctl) continue; // Can't create thread without teacher_link_id

    results.push({
      childId: row.child_id,
      name: child?.pet_name ?? 'Unknown',
      nameHi: child?.pet_name_hi ?? null,
      avatarUrl: child?.avatar_url ?? null,
      parentUserId: ctl.parent_user_id,
      teacherLinkId: ctl.id,
    });
  }

  return results;
}
