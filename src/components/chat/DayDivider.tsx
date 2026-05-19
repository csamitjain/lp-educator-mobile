import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, FontFamily, FontSize, Spacing } from '../../../theme';
import { formatDayDivider } from '@/lib/chat-types';

interface Props {
  dateKey: string;
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export default function DayDivider({ dateKey }: Props) {
  const { t } = useTranslation();
  const todayKey = getTodayKey();
  const yesterdayKey = getYesterdayKey();

  const label = formatDayDivider(
    dateKey,
    todayKey,
    yesterdayKey,
  );

  // Use translated labels for today/yesterday
  const displayLabel =
    label === 'Today' ? t('chat.today') :
    label === 'Yesterday' ? t('chat.yesterday') :
    label;

  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.label}>{displayLabel}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    gap: Spacing[3],
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  label: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.inkFaint,
    backgroundColor: Colors.cream,
    paddingHorizontal: Spacing[2],
  },
});
