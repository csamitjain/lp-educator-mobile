import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEducator } from '@/lib/educator-context';
import { useRole } from '@/lib/role-context';
import { useMilestones, useMilestoneRecords } from '@/hooks/useMilestones';
import { QueryKeys } from '@/lib/constants';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../theme';
import AppHeader from '@/components/AppHeader';
import EmptyState from '@/components/EmptyState';
import {
  AddMilestoneTemplateSheet,
  MarkSingleSheet,
  BulkMarkMilestoneSheet,
} from '@/components/sheets/AddMilestoneSheet';
import type { Milestone } from '@/types/database';

type Tab = 'templates' | 'records';

const STATUS_COLORS = {
  pending:     { bg: Colors.creamDark,   text: Colors.inkMuted },
  in_progress: { bg: Colors.amberPale,   text: '#7A5200' },
  achieved:    { bg: Colors.leafPale,    text: Colors.forest },
};

export default function MilestonesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useEducator();
  const { activeRole } = useRole();

  const [activeTab, setActiveTab] = useState<Tab>('templates');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [showMarkSingle, setShowMarkSingle] = useState(false);
  const [showBulkMark, setShowBulkMark] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  const { data: milestones = [], isLoading: mlLoading } = useMilestones(profile);
  const { data: records = [], isLoading: recLoading } = useMilestoneRecords(profile);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QueryKeys.milestones(profile?.id ?? '') }),
      queryClient.invalidateQueries({ queryKey: QueryKeys.milestoneRecords(profile?.id ?? '') }),
    ]);
    setRefreshing(false);
  }

  function renderTemplate({ item }: { item: Milestone }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            {item.category && (
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>
                  {t(`milestones.category.${item.category}`)}
                </Text>
              </View>
            )}
            <Text style={styles.milestoneTitle}>{item.title}</Text>
            {item.title_hi && (
              <Text style={styles.milestoneTitleHi}>{item.title_hi}</Text>
            )}
            {item.description && (
              <Text style={styles.milestoneDesc} numberOfLines={2}>{item.description}</Text>
            )}
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => { setSelectedMilestone(item); setShowMarkSingle(true); }}
            >
              <Text style={styles.actionBtnText}>👤</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => { setSelectedMilestone(item); setShowBulkMark(true); }}
            >
              <Text style={styles.actionBtnText}>👥</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  function renderRecord({ item }: { item: any }) {
    const statusColor = STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.pending;
    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Text style={styles.milestoneTitle}>{item.milestoneTitle}</Text>
            <Text style={styles.childName}>{item.childName}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusChipText, { color: statusColor.text }]}>
              {t(`milestone_status.${item.status}`)}
            </Text>
          </View>
        </View>
        {item.note && <Text style={styles.milestoneDesc}>{item.note}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <AppHeader
        title={t('milestones.title')}
        role={activeRole?.role}
        rightElement={
          activeTab === 'templates' ? (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddTemplate(true)}>
              <Text style={styles.addBtnText}>+ {t('buttons.add')}</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['templates', 'records'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {t(tab === 'templates' ? 'milestones.templates_tab' : 'milestones.records_tab')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'templates' ? (
        <FlatList
          data={milestones}
          keyExtractor={(item) => item.id}
          renderItem={renderTemplate}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.forest]} />}
          ListEmptyComponent={
            !mlLoading ? (
              <EmptyState emoji="🏆" title={t('milestones.empty')}
                actionLabel={`+ ${t('milestones.add_template')}`}
                onAction={() => setShowAddTemplate(true)} />
            ) : null
          }
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderRecord}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.forest]} />}
          ListEmptyComponent={!recLoading ? <EmptyState emoji="📋" title={t('common.no_data')} /> : null}
          contentContainerStyle={styles.listContent}
        />
      )}

      <AddMilestoneTemplateSheet visible={showAddTemplate} onClose={() => setShowAddTemplate(false)} />
      <MarkSingleSheet visible={showMarkSingle} milestone={selectedMilestone}
        activeRole={activeRole} onClose={() => setShowMarkSingle(false)} />
      <BulkMarkMilestoneSheet visible={showBulkMark} milestones={milestones}
        activeRole={activeRole} onClose={() => setShowBulkMark(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.cream },
  listContent: { padding: Spacing[4], paddingBottom: Spacing[10] },
  tabBar: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing[3], borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.forest },
  tabText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.inkMuted },
  tabTextActive: { color: Colors.forest },
  card: { backgroundColor: Colors.white, borderRadius: Radius.card, padding: Spacing[4], marginBottom: Spacing[3], ...Shadows.soft },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3] },
  cardLeft: { flex: 1 },
  cardActions: { flexDirection: 'row', gap: Spacing[2] },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.leafPale, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 16 },
  categoryChip: { alignSelf: 'flex-start', backgroundColor: Colors.creamDark, paddingHorizontal: Spacing[2], paddingVertical: 2, borderRadius: Radius.full, marginBottom: Spacing[1] },
  categoryChipText: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.inkMuted },
  milestoneTitle: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.ink, marginBottom: 2 },
  milestoneTitleHi: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.inkMuted, marginBottom: 2 },
  milestoneDesc: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.inkFaint, marginTop: Spacing[1] },
  childName: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.inkMuted, marginTop: 2 },
  statusChip: { paddingHorizontal: Spacing[2], paddingVertical: 3, borderRadius: Radius.full },
  statusChipText: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold },
  addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing[3], paddingVertical: Spacing[1], borderRadius: Radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  addBtnText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.white },
});
