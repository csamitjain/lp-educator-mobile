import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useEducator } from '@/lib/educator-context';
import { useRole } from '@/lib/role-context';
import { useObservations } from '@/hooks/useObservations';
import { QueryKeys } from '@/lib/constants';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../theme';
import AppHeader from '@/components/AppHeader';
import StudentAvatar from '@/components/StudentAvatar';
import EmptyState from '@/components/EmptyState';
import AddObservationSheet from '@/components/sheets/AddObservationSheet';
import type { ObservationRow } from '@/hooks/useObservations';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  academic:   { bg: '#E8F5EE', text: Colors.forest },
  behavioral: { bg: '#FFF3DC', text: '#7A5200' },
  social:     { bg: '#EEE8FF', text: '#4A2D8F' },
  physical:   { bg: '#FCE9E1', text: Colors.terra },
  emotional:  { bg: '#FFF3DC', text: '#7A5200' },
  creative:   { bg: '#E8F5EE', text: Colors.forest },
  general:    { bg: Colors.creamDark, text: Colors.inkMuted },
};

export default function ObservationsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useEducator();
  const { activeRole } = useRole();

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: observations = [], isLoading } = useObservations(profile, activeRole);

  async function handleRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: QueryKeys.observations(profile?.id ?? '', activeRole?.id ?? ''),
    });
    setRefreshing(false);
  }

  function renderRow({ item }: { item: ObservationRow }) {
    const catColor = CATEGORY_COLORS[item.category ?? 'general'] ?? CATEGORY_COLORS.general;
    const date = new Date(item.created_at).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <StudentAvatar name={item.childName} avatarUrl={item.childAvatarUrl} size="sm" />
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.childName}>{item.childName}</Text>
            <Text style={styles.date}>{date}</Text>
          </View>
          {item.category && (
            <View style={[styles.categoryChip, { backgroundColor: catColor.bg }]}>
              <Text style={[styles.categoryChipText, { color: catColor.text }]}>
                {t(`observations.category.${item.category}`)}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.note}>{item.note}</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <AppHeader
        title={t('observations.title')}
        role={activeRole?.role}
        rightElement={
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddSheet(true)}>
            <Text style={styles.addBtnText}>+ {t('buttons.add')}</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={observations}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.forest]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              emoji="📝"
              title={t('observations.empty')}
              actionLabel={`+ ${t('observations.add_title')}`}
              onAction={() => setShowAddSheet(true)}
            />
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />

      <AddObservationSheet visible={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.cream },
  listContent: { padding: Spacing[4], paddingBottom: Spacing[10] },
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.card,
    padding: Spacing[4], marginBottom: Spacing[3], ...Shadows.soft,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginBottom: Spacing[3] },
  cardHeaderInfo: { flex: 1 },
  childName: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.ink },
  date: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.inkFaint, marginTop: 1 },
  categoryChip: {
    paddingHorizontal: Spacing[2], paddingVertical: 3,
    borderRadius: Radius.full,
  },
  categoryChipText: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold },
  note: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.ink, lineHeight: 22 },
  addBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1], borderRadius: Radius.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  addBtnText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.white },
});
