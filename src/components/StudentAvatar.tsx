import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Colors, FontFamily, FontSize, Layout } from '../../theme';
import { getPublicAvatarUrl } from '@/lib/supabase';

interface Props {
  avatarUrl?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_MAP = {
  sm: Layout.avatarSm,
  md: Layout.avatarMd,
  lg: Layout.avatarLg,
  xl: Layout.avatarXl,
};

const FONT_SIZE_MAP = {
  sm: FontSize.xs,
  md: FontSize.sm,
  lg: FontSize.lg,
  xl: FontSize['2xl'],
};

// Deterministic color from name
const AVATAR_COLORS = [
  Colors.forest, Colors.leaf, Colors.terra,
  Colors.amber, '#7C6FCD', '#2196F3',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function StudentAvatar({ avatarUrl, name, size = 'md' }: Props) {
  const dimension = SIZE_MAP[size];
  const fontSize = FONT_SIZE_MAP[size];
  const color = getAvatarColor(name);
  const initials = getInitials(name || '?');

  const resolvedUrl = avatarUrl
    ? avatarUrl.startsWith('http')
      ? avatarUrl
      : getPublicAvatarUrl(avatarUrl)
    : null;

  if (resolvedUrl) {
    return (
      <Image
        source={{ uri: resolvedUrl }}
        style={[styles.image, { width: dimension, height: dimension, borderRadius: dimension / 2 }]}
        contentFit="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: dimension, height: dimension, borderRadius: dimension / 2, backgroundColor: color },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: Colors.creamDark,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
  },
});
