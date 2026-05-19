import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { QueryKeys, RealtimeChannels } from '@/lib/constants';
import { mapThreadToVM, type ChatThreadVM } from '@/lib/chat-types';

export function useChatThreads(educatorUserId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QueryKeys.chatThreads(educatorUserId ?? ''),
    queryFn: async (): Promise<ChatThreadVM[]> => {
      if (!educatorUserId) return [];

      // Fetch threads with child + parent profile joined
      const { data: threads, error } = await supabase
        .from('chat_threads')
        .select(`
          *,
          children ( id, pet_name, pet_name_hi, avatar_url ),
          profiles!chat_threads_parent_user_id_fkey ( id, full_name, avatar_url )
        `)
        .eq('educator_user_id', educatorUserId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw new Error(error.message);
      if (!threads?.length) return [];

      // Fetch last_read_at for each thread
      const threadIds = threads.map((t: any) => t.id);
      const { data: reads } = await supabase
        .from('chat_thread_reads')
        .select('thread_id, last_read_at')
        .eq('user_id', educatorUserId)
        .in('thread_id', threadIds);

      const readMap = new Map(
        (reads ?? []).map((r) => [r.thread_id, r.last_read_at])
      );

      // Fetch unread counts per thread
      const unreadCounts = await Promise.all(
        threads.map(async (thread: any) => {
          const lastRead = readMap.get(thread.id) ?? null;
          let countQuery = supabase
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('thread_id', thread.id)
            .eq('sender_role', 'parent')
            .is('deleted_at', null);

          if (lastRead) countQuery = countQuery.gt('created_at', lastRead);

          const { count } = await countQuery;
          return { threadId: thread.id, count: count ?? 0 };
        })
      );

      const unreadMap = new Map(unreadCounts.map((u) => [u.threadId, u.count]));

      return threads.map((thread: any) =>
        mapThreadToVM(
          thread,
          thread.children,
          thread.profiles,
          unreadMap.get(thread.id) ?? 0
        )
      );
    },
    enabled: !!educatorUserId,
    staleTime: 30 * 1000,
  });

  // Realtime — refresh inbox on new message
  useEffect(() => {
    if (!educatorUserId) return;

    const channel = supabase
      .channel(RealtimeChannels.chatInbox(educatorUserId))
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => {
          queryClient.invalidateQueries({
            queryKey: QueryKeys.chatThreads(educatorUserId),
          });
          queryClient.invalidateQueries({
            queryKey: ['chat_unread_total', educatorUserId],
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [educatorUserId, queryClient]);

  return query;
}
