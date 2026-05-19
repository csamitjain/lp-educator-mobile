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
import { useEnrichedFeeStatus, useFeePlans, useFeePayments } from '@/hooks/useFee';
import { currentYearMonth, formatYearMonth, totalCollectedForMonth } from '@/lib/fee-utils';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../../theme';
import AppHeader from '@/components/AppHeader';
import StudentAvatar from '@/components/StudentAvatar';
import EmptyState from '@/components/EmptyState';
import CollectFeeSheet from '@/components/sheets/CollectFeeSheet';
import type { EnrichedFeeStatus } from '@/hooks/useFee';

type Tab = 'pending' | 'paid';

export default function FeeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useEducator();
  const { activeRole } = useRole();

  const month = currentYearMonth();
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [refreshing, setRefreshing] = useState(false);
  const [collectTarget, setCollectTarget] = useState<EnrichedFeeStatus | null>(null);

  const { data: feeStatusList = [], isLoading } = useEnrichedFeeStatus(profile, activeRole, month);
  const { data: payments = [] } = useFeePayments(profile, month);

  const pending = feeStatusList.filter((s) => !s.isPaid);
  const paid = feeStatusList.filter((s) => s.isPaid);
  const totalCollected = totalCollectedForMonth(payments, month);

  async function handleRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['fee_status_enriched'] });
    await queryClient.invalidateQueries({ queryKey: ['fee_payments'] });
    setRefreshing(false);
  }

  function renderPendingRow({ item }: { item: EnrichedFeeStatus }) {
    return (
      <View style={styles.feeCard}>
        <StudentAvatar name={item.childName} avatarUrl={item.childAvatarUrl} size="md" />
        <View style={styles.feeInfo}>
          <Text style={styles.childName}>{item.childName}</Text>
          {item.childNameHi && (
            <Text style={styles.childNameHi}>{item.childNameHi}</Text>
          )}
          <Text style={styles.feeAmount}>
            ₹{item.planAmount}
            <Text style={styles.feeCycle}> / {t(`fee.cycle_${item.planCycle}` as any)}</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={styles.collectBtn}
          onPress={() => setCollectTarget(item)}
        >
          <Text style={styles.collectBtnText}>{t('buttons.collect')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderPaidRow({ item }: { item: EnrichedFeeStatus }) {
    return (
      <View style={styles.feeCard}>
        <StudentAvatar name={item.childName} avatarUrl={item.childAvatarUrl} size="md" />
        <View style={styles.feeInfo}>
          <Text style={styles.childName}>{item.childName}</Text>
          {item.childNameHi && (
            <Text style={styles.childNameHi}>{item.childNameHi}</Text>
          )}
          {item.paidOn && (
            <Text style={styles.paidOn}>
              {t('fee.paid_on_label')}: {item.paidOn}
            </Text>
          )}
        </View>
        <View style={styles.paidBadge}>
          <Text style={styles.paidAmount}>₹{item.paidAmount ?? item.planAmount}</Text>
          <Text style={styles.paidLabel}>✓ Paid</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <AppHeader
        title={t('fee.title')}
        role={activeRole?.role}
        rightElement={
          <TouchableOpacity
            style={styles.plansBtn}
            onPress={() => router.push('/(tabs)/fee/plans' as any)}
          >
            <Text style={styles.plansBtnText}>{t('fee.plans_title')}</Text>
          </TouchableOpacity>
        }
      />

      {/* Month + summary bar */}
      <View style={styles.summaryBar}>
        <View>
          <Text style={styles.monthLabel}>{formatYearMonth(month)}</Text>
          <Text style={styles.collectedLabel}>
            ₹{totalCollected.toLocaleString('en-IN')} {t('fee.paid_tab')}
          </Text>
        </View>
        <View style={styles.summaryRight}>
          <Text style={styles.pendingCount}>{pending.length}</Text>
          <Text style={styles.pendingLabel}>{t('fee.pending_tab')}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['pending', 'paid'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {t(tab === 'pending' ? 'fee.pending_tab' : 'fee.paid_tab')}
              {tab === 'pending' && pending.length > 0 && (
                <Text style={styles.tabBadge}> ({pending.length})</Text>
              )}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={activeTab === 'pending' ? pending : paid}
        keyExtractor={(item) => item.childId}
        renderItem={activeTab === 'pending' ? renderPendingRow : renderPaidRow}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.forest]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              emoji={activeTab === 'pending' ? '🎉' : '💰'}
              title={t(activeTab === 'pending' ? 'fee.no_pending' : 'fee.no_paid')}
            />
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />

      <CollectFeeSheet
        visible={!!collectTarget}
        feeStatus={collectTarget}
        onClose={() => setCollectTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.cream },
  listContent: { padding: Spacing[4], paddingBottom: Spacing[10] },

  summaryBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.white, paddingHorizontal: Spacing[5], paddingVertical: Spacing[3],
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  monthLabel: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.ink },
  collectedLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.inkMuted, marginTop: 2 },
  summaryRight: { alignItems: 'flex-end' },
  pendingCount: { fontSize: FontSize['2xl'], fontFamily: FontFamily.extraBold, color: Colors.terra },
  pendingLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.inkMuted },

  tabBar: { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing[3], borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.forest },
  tabText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.inkMuted },
  tabTextActive: { color: Colors.forest },
  tabBadge: { color: Colors.terra },

  feeCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing[3],
    backgroundColor: Colors.white, borderRadius: Radius.card,
    padding: Spacing[4], marginBottom: Spacing[3], ...Shadows.soft,
  },
  feeInfo: { flex: 1 },
  childName: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.ink },
  childNameHi: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.inkMuted, marginTop: 1 },
  feeAmount: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.forest, marginTop: Spacing[1] },
  feeCycle: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.inkMuted },
  paidOn: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.inkFaint, marginTop: 2 },

  collectBtn: { backgroundColor: Colors.forest, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2], borderRadius: Radius.md },
  collectBtnText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.white },

  paidBadge: { alignItems: 'flex-end' },
  paidAmount: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.forest },
  paidLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.leaf, marginTop: 2 },

  plansBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing[3], paddingVertical: Spacing[1], borderRadius: Radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  plansBtnText: { fontSize: FontSize.xs, fontFamily: FontFamily.bold, color: Colors.white },
});
