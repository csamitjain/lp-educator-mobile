import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../../theme';

interface Props {
  label: string;
  value: number | string;
  emoji: string;
  gradientColors: readonly [string, string];
  onPress?: () => void;
}

export default function StatCard({ label, value, emoji, gradientColors, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      style={styles.wrapper}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label} numberOfLines={2}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minWidth: '45%',
    maxWidth: '48%',
    marginBottom: Spacing[3],
  },
  card: {
    borderRadius: Radius.card,
    padding: Spacing[4],
    minHeight: 100,
    justifyContent: 'space-between',
    ...Shadows.soft,
  },
  emoji: {
    fontSize: 24,
    marginBottom: Spacing[1],
  },
  value: {
    fontSize: FontSize['3xl'],
    fontFamily: FontFamily.extraBold,
    color: Colors.ink,
    lineHeight: 36,
  },
  label: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.inkMuted,
    marginTop: Spacing[1],
  },
});
