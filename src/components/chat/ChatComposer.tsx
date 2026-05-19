import React, { useState } from 'react';
import {
  View, TextInput, TouchableOpacity, Text,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../../theme';
import { uploadChatImage } from '@/lib/chatStorage';
import { ImageConfig } from '@/lib/constants';

interface Props {
  threadId: string;
  onSend: (body: string | null, imagePath: string | null) => Promise<void>;
  disabled?: boolean;
}

export default function ChatComposer({ threadId, onSend, disabled }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  async function handleSendText() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSend(trimmed, null);
      setText('');
    } finally {
      setSending(false);
    }
  }

  async function handlePickImage() {
    if (uploadingImage) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];

    // Check file size (~rough estimate from width/height)
    if (asset.fileSize && asset.fileSize > ImageConfig.maxFileSizeBytes) {
      return; // TODO: show toast
    }

    setUploadingImage(true);
    try {
      const { path, error } = await uploadChatImage(asset.uri, threadId);
      if (error || !path) return;
      await onSend(null, path);
    } finally {
      setUploadingImage(false);
    }
  }

  const canSend = text.trim().length > 0 && !sending && !disabled;

  return (
    <View style={styles.container}>
      {/* Image button */}
      <TouchableOpacity
        onPress={handlePickImage}
        disabled={uploadingImage || disabled}
        style={styles.iconBtn}
        activeOpacity={0.7}
      >
        {uploadingImage ? (
          <ActivityIndicator size="small" color={Colors.forest} />
        ) : (
          <Text style={styles.iconBtnText}>📷</Text>
        )}
      </TouchableOpacity>

      {/* Text input */}
      <TextInput
        style={styles.input}
        placeholder={t('chat.type_message')}
        placeholderTextColor={Colors.inkFaint}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={2000}
        editable={!disabled}
        returnKeyType="default"
      />

      {/* Send button */}
      <TouchableOpacity
        onPress={handleSendText}
        disabled={!canSend}
        style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
        activeOpacity={0.8}
      >
        {sending ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.sendBtnText}>➤</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    paddingBottom: Platform.OS === 'android' ? Spacing[2] : Spacing[4],
    gap: Spacing[2],
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.creamDark,
  },
  iconBtnText: { fontSize: 20 },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: Colors.cream,
    borderRadius: Radius.card,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.ink,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.border,
  },
  sendBtnText: {
    fontSize: 18,
    color: Colors.white,
  },
});
