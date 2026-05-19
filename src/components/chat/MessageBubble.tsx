import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../../theme';
import type { ChatMessageVM } from '@/lib/chat-types';

interface Props {
  message: ChatMessageVM;
  imageUrl?: string | null;
  onImagePress?: () => void;
}

export default function MessageBubble({ message, imageUrl, onImagePress }: Props) {
  const { t } = useTranslation();
  const { isMine, body, imagePath, deletedAt, createdAt } = message;

  const time = new Date(createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (deletedAt) {
    return (
      <View style={[styles.row, isMine ? styles.rowRight : styles.rowLeft]}>
        <View style={[styles.bubble, styles.deletedBubble]}>
          <Text style={styles.deletedText}>{t('chat.message_deleted')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, isMine ? styles.rowRight : styles.rowLeft]}>
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
        ]}
      >
        {/* Image */}
        {imagePath && imageUrl && (
          <TouchableOpacity onPress={onImagePress} activeOpacity={0.9}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
        )}

        {/* Image loading placeholder */}
        {imagePath && !imageUrl && (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>📷</Text>
          </View>
        )}

        {/* Text body */}
        {body ? (
          <Text style={[styles.bodyText, isMine ? styles.bodyTextMine : styles.bodyTextTheirs]}>
            {body}
          </Text>
        ) : null}

        {/* Timestamp */}
        <Text style={[styles.timeText, isMine ? styles.timeTextMine : styles.timeTextTheirs]}>
          {time}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 2,
    paddingHorizontal: Spacing[4],
  },
  rowRight: { alignItems: 'flex-end' },
  rowLeft: { alignItems: 'flex-start' },

  bubble: {
    maxWidth: '78%',
    borderRadius: Radius.card,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    minWidth: 60,
  },
  bubbleMine: {
    backgroundColor: Colors.forest,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  deletedBubble: {
    backgroundColor: Colors.creamDark,
    borderRadius: Radius.card,
  },

  image: {
    width: 220,
    height: 160,
    borderRadius: Radius.md,
    marginBottom: Spacing[1],
    backgroundColor: Colors.creamDark,
  },
  imagePlaceholder: {
    width: 220,
    height: 160,
    borderRadius: Radius.md,
    backgroundColor: Colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[1],
  },
  imagePlaceholderText: { fontSize: 32 },

  bodyText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    lineHeight: 22,
  },
  bodyTextMine: { color: Colors.white },
  bodyTextTheirs: { color: Colors.ink },

  timeText: {
    fontSize: 10,
    fontFamily: FontFamily.regular,
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  timeTextMine: { color: 'rgba(255,255,255,0.65)' },
  timeTextTheirs: { color: Colors.inkFaint },

  deletedText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.inkFaint,
    fontStyle: 'italic',
  },
});
