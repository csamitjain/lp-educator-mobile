import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity,
  Text, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useChatMessages, useSendMessage, useMarkThreadRead } from '@/hooks/useChatMessages';
import { useChatThreads } from '@/hooks/useChatThreads';
import { useEducator } from '@/lib/educator-context';
import { groupMessagesByDate } from '@/lib/chat-types';
import { getSignedChatImageUrl } from '@/lib/chatStorage';
import { Colors, FontFamily, FontSize, Gradients, Spacing } from '../../../theme';
import MessageBubble from '@/components/chat/MessageBubble';
import DayDivider from '@/components/chat/DayDivider';
import ChatComposer from '@/components/chat/ChatComposer';
import StudentAvatar from '@/components/StudentAvatar';
import type { ChatMessageVM } from '@/lib/chat-types';

export default function ChatThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const router = useRouter();
  const { userId } = useEducator();
  const flatListRef = useRef<FlatList>(null);

  const { data: messages = [] } = useChatMessages(threadId ?? null);
  const { data: threads = [] } = useChatThreads(userId);
  const { mutateAsync: sendMessage } = useSendMessage();
  const { mutate: markRead } = useMarkThreadRead();

  // Find thread details for header
  const thread = threads.find((t) => t.id === threadId);

  // Signed URL cache for images in this session
  const [imageUrls, setImageUrls] = React.useState<Record<string, string>>({});

  // Mark as read when screen opens and on new messages
  useEffect(() => {
    if (threadId && userId) {
      markRead({ threadId, userId });
    }
  }, [threadId, userId, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Fetch signed URLs for image messages
  useEffect(() => {
    const imageMsgs = messages.filter((m) => m.imagePath && !imageUrls[m.imagePath]);
    imageMsgs.forEach(async (msg) => {
      if (!msg.imagePath) return;
      const url = await getSignedChatImageUrl(msg.imagePath);
      if (url) {
        setImageUrls((prev) => ({ ...prev, [msg.imagePath!]: url }));
      }
    });
  }, [messages]);

  async function handleSend(body: string | null, imagePath: string | null) {
    if (!threadId || !userId) return;
    await sendMessage({ threadId, senderUserId: userId, body, imagePath });
  }

  // Build flat list data with day dividers
  const grouped = groupMessagesByDate(messages);
  const listData: Array<{ type: 'divider'; dateKey: string } | { type: 'message'; message: ChatMessageVM }> = [];

  for (const group of grouped) {
    listData.push({ type: 'divider', dateKey: group.dateKey });
    for (const msg of group.messages) {
      listData.push({ type: 'message', message: msg });
    }
  }

  const renderItem = useCallback(({ item }: { item: typeof listData[0] }) => {
    if (item.type === 'divider') {
      return <DayDivider dateKey={item.dateKey} />;
    }
    const msg = item.message;
    const imageUrl = msg.imagePath ? imageUrls[msg.imagePath] ?? null : null;
    return (
      <MessageBubble
        message={msg}
        imageUrl={imageUrl}
      />
    );
  }, [imageUrls]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <LinearGradient
        colors={Gradients.header.colors}
        start={Gradients.header.start}
        end={Gradients.header.end}
        locations={Gradients.header.locations}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>

        {thread && (
          <>
            <StudentAvatar
              name={thread.childName}
              avatarUrl={thread.childAvatarUrl}
              size="sm"
            />
            <View style={styles.headerInfo}>
              <Text style={styles.headerName} numberOfLines={1}>
                {thread.childName}
              </Text>
              {thread.childNameHi && (
                <Text style={styles.headerNameHi} numberOfLines={1}>
                  {thread.childNameHi}
                </Text>
              )}
            </View>
          </>
        )}
      </LinearGradient>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={listData}
        keyExtractor={(item, index) =>
          item.type === 'divider' ? `div-${item.dateKey}` : `msg-${item.message.id}`
        }
        renderItem={renderItem}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
      />

      {/* Composer */}
      <ChatComposer
        threadId={threadId ?? ''}
        onSend={handleSend}
        disabled={!threadId || !userId}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.cream },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: Spacing[3],
    paddingHorizontal: Spacing[4],
    gap: Spacing[3],
  },
  backBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 28,
    color: Colors.white,
    fontFamily: FontFamily.bold,
    lineHeight: 32,
  },
  headerInfo: { flex: 1 },
  headerName: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  headerNameHi: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.75)',
  },

  messageList: { flex: 1 },
  messageContent: {
    paddingTop: Spacing[3],
    paddingBottom: Spacing[4],
  },
});
