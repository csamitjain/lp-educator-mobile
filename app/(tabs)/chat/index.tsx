import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEducator } from '@/lib/educator-context';
import { useChatThreads } from '@/hooks/useChatThreads';
import { QueryKeys } from '@/lib/constants';
import { formatThreadTime } from '@/lib/chat-types';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../../theme';
import AppHeader from '@/components/AppHeader';
import StudentAvatar from '@/components/StudentAvatar';
import EmptyState from '@/components/EmptyState';
import NewChatSheet from '@/components/chat/NewChatSheet';
import type { ChatThreadVM } from '@/lib/chat-types';

export default function ChatInboxScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId } = useEducator();

  const [showNewChat, setShowNewChat] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: threads = [], isLoading } = useChatThreads(userId);

  async function handleRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: QueryKeys.chatThreads(userId ?? ''),
    });
    setRefreshing(false);
  }

  function renderThread({ item }: { item: ChatThreadVM }) {
    const time = formatThreadTime(item.lastMessageAt);
    const hasUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={styles.threadCard}
        onPress={() => router.push(`/(tabs)/chat/${item.id}` as any)}
        activeOpacity={0.75}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <StudentAvatar name={item.childName} avatarUrl={item.childAvatarUrl} size="md" />
          {hasUnread && <View style={styles.unreadDot} />}
        </View>

        {/* Content */}
        <View style={styles.threadContent}>
          <View style={styles.threadTop}>
            <Text style={[styles.childName, hasUnread && styles.childNameUnread]} numberOfLines={1}>
              {item.childName}
            </Text>
            <Text style={[styles.time, hasUnread && styles.timeUnread]}>{time}</Text>
          </View>
          <View style={styles.threadBottom}>
            <Text
              style={[styles.preview, hasUnread && styles.previewUnread]}
              numberOfLines={1}
            >
              {item.lastMessagePreview ?? t('chat.start_chat')}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.flex}>
      <AppHeader
        title={t('chat.title')}
        rightElement={
          <TouchableOpacity style={styles.newChatBtn} onPress={() => setShowNewChat(true)}>
            <Text style={styles.newChatBtnText}>✏️</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        renderItem={renderThread}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.forest]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              emoji="💬"
              title={t('chat.no_threads')}
              subtitle={t('chat.start_chat')}
              actionLabel={t('chat.new_chat')}
              onAction={() => setShowNewChat(true)}
            />
          ) : null
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <NewChatSheet visible={showNewChat} onClose={() => setShowNewChat(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.white },
  listContent: { paddingBottom: Spacing[10] },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 76 },

  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
    backgroundColor: Colors.white,
  },
  avatarContainer: { position: 'relative' },
  unreadDot: {
    position: 'absolute', top: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.forest,
    borderWidth: 2, borderColor: Colors.white,
  },
  threadContent: { flex: 1 },
  threadTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  childName: { fontSize: FontSize.base, fontFamily: FontFamily.semiBold, color: Colors.ink, flex: 1 },
  childNameUnread: { fontFamily: FontFamily.bold },
  time: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.inkFaint },
  timeUnread: { color: Colors.forest, fontFamily: FontFamily.semiBold },
  threadBottom: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  preview: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.inkMuted, flex: 1 },
  previewUnread: { fontFamily: FontFamily.semiBold, color: Colors.ink },
  unreadBadge: {
    backgroundColor: Colors.forest, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  unreadBadgeText: { fontSize: 11, fontFamily: FontFamily.bold, color: Colors.white },

  newChatBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  newChatBtnText: { fontSize: 18 },
});
