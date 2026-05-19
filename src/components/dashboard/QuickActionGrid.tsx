import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../../theme';
import { roleHasFee } from '@/lib/constants';
import type { EducatorRole } from '@/types/database';

interface QuickAction {
  key: string;
  labelKey: string;
  emoji: string;
  route: string;
  bg: string;
}

const BASE_ACTIONS: QuickAction[] = [
  { key: 'attendance', labelKey: 'dashboard.quick_actions.attendance', emoji: '✅', route: '/(tabs)/attendance', bg: '#E8F5EE' },
  { key: 'add_student', labelKey: 'dashboard.quick_actions.add_student', emoji: '👤', route: '/(tabs)/students', bg: '#EEF2FF' },
  { key: 'observation', labelKey: 'dashboard.quick_actions.observation', emoji: '📝', route: '/(tabs)/observations', bg: '#FFF3DC' },
  { key: 'milestones', labelKey: 'dashboard.quick_actions.milestones', emoji: '🏆', route: '/milestones', bg: '#FCE9E1' },
  { key: 'chat', labelKey: 'dashboard.quick_actions.chat', emoji: '💬', route: '/(tabs)/chat', bg: '#E8F5EE' },
  { key: 'classes', labelKey: 'dashboard.quick_actions.classes', emoji: '🏫', route: '/classes', bg: '#F3ECE0' },
];

const FEE_ACTION: QuickAction = {
  key: 'fee',
  labelKey: 'dashboard.quick_actions.fee',
  emoji: '💰',
  route: '/(tabs)/fee',
  bg: '#FFF3DC',
};

interface Props {
  role: EducatorRole | null;
}

export default function QuickActionGrid({ role }: Props) {
  const { t } = useTranslation();
  const router = useRouter();

  const actions = role && roleHasFee(role)
    ? [...BASE_ACTIONS, FEE_ACTION]
    : BASE_ACTIONS;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t('dashboard.quick_actions.title')}</Text>
      <View style={styles.grid}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.key}
            style={[styles.actionBtn, { backgroundColor: action.bg }]}
            onPress={() => router.push(action.route as any)}
            activeOpacity={0.75}
          >
            <Text style={styles.actionEmoji}>{action.emoji}</Text>
            <Text style={styles.actionLabel} numberOfLines={2}>
              {t(action.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing[5],
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bold,
    color: Colors.ink,
    marginBottom: Spacing[3],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  actionBtn: {
    width: '30%',
    flexGrow: 1,
    borderRadius: Radius.md,
    padding: Spacing[3],
    alignItems: 'center',
    minHeight: 76,
    justifyContent: 'center',
    ...Shadows.soft,
  },
  actionEmoji: {
    fontSize: 22,
    marginBottom: Spacing[1],
  },
  actionLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.ink,
    textAlign: 'center',
    lineHeight: 15,
  },
});
