import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../../theme';
import type { ActivityItem } from '@/hooks/useRecentActivity';

const TYPE_CONFIG = {
  attendance: { emoji: '✅', color: Colors.leaf },
  observation: { emoji: '📝', color: Colors.amber },
  milestone: { emoji: '🏆', color: Colors.terra },
};

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface Props {
  items: ActivityItem[];
  isLoading: boolean;
}

export default function RecentActivity({ items, isLoading }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t('dashboard.recent.title')}</Text>
      <View style={styles.card}>
        {isLoading ? (
          <Text style={styles.emptyText}>{t('common.loading')}</Text>
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>{t('dashboard.recent.empty')}</Text>
        ) : (
          items.map((item, index) => {
            const config = TYPE_CONFIG[item.type];
            return (
              <View key={item.id}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.row}>
                  <View style={[styles.dot, { backgroundColor: config.color }]} />
                  <View style={styles.rowContent}>
                    <Text style={styles.childName} numberOfLines={1}>
                      {item.childName}
                    </Text>
                    <Text style={styles.description} numberOfLines={1}>
                      {config.emoji} {item.description}
                    </Text>
                  </View>
                  <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                </View>
              </View>
            );
          })
        )}
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
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing[4],
    ...Shadows.soft,
  },
  emptyText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.inkFaint,
    textAlign: 'center',
    paddingVertical: Spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[2],
    gap: Spacing[3],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
  },
  childName: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.ink,
  },
  description: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: Colors.inkMuted,
    marginTop: 2,
  },
  time: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: Colors.inkFaint,
    flexShrink: 0,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
});
