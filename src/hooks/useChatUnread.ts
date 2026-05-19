import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { QueryKeys, RealtimeChannels } from '@/lib/constants';
import { useQueryClient } from '@tanstack/react-query';

export function useChatUnread(educatorUserId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['chat_unread_total', educatorUserId ?? ''],
    queryFn: async (): Promise<number> => {
      if (!educatorUserId) return 0;

      // Get all threads for this educator
      const { data: threads } = await supabase
        .from('chat_threads')
        .select('id')
        .eq('educator_user_id', educatorUserId);

      if (!threads?.length) return 0;

      const threadIds = threads.map((t) => t.id);

      // Get last_read_at for each thread
      const { data: reads } = await supabase
        .from('chat_thread_reads')
        .select('thread_id, last_read_at')
        .eq('user_id', educatorUserId)
        .in('thread_id', threadIds);

      const readMap = new Map((reads ?? []).map((r) => [r.thread_id, r.last_read_at]));

      // Count unread messages across all threads
      let total = 0;
      for (const thread of threads) {
        const lastRead = readMap.get(thread.id) ?? null;
        const query = supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('thread_id', thread.id)
          .eq('sender_role', 'parent')
          .is('deleted_at', null);

        if (lastRead) {
          query.gt('created_at', lastRead);
        }

        const { count } = await query;
        total += count ?? 0;
      }

      return total;
    },
    enabled: !!educatorUserId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Poll every 60s as fallback
  });

  // Realtime subscription for inbox updates
  useEffect(() => {
    if (!educatorUserId) return;

    const channel = supabase
      .channel(RealtimeChannels.chatInbox(educatorUserId))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `sender_role=eq.parent`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['chat_unread_total', educatorUserId],
          });
          queryClient.invalidateQueries({
            queryKey: QueryKeys.chatThreads(educatorUserId),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [educatorUserId, queryClient]);

  return query;
}
