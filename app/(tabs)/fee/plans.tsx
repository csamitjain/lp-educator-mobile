import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEducator } from '@/lib/educator-context';
import { useRole } from '@/lib/role-context';
import { useFeePlans, useToggleFeePlan } from '@/hooks/useFee';
import { QueryKeys, } from '@/lib/constants';
import { formatYearMonth, monthlyEquivalent } from '@/lib/fee-utils';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../../theme';
import AppHeader from '@/components/AppHeader';
import StudentAvatar from '@/components/StudentAvatar';
import EmptyState from '@/components/EmptyState';
import AddFeePlanSheet from '@/components/sheets/AddFeePlanSheet';
import Toast from '@/components/ui/Toast';
import type { FeePlan } from '@/types/database';

export default function FeePlansScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useEducator();
  const { activeRole } = useRole();

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', visible: false });

  const { data: plans = [], isLoading } = useFeePlans(profile, activeRole);
  const { mutate: togglePlan } = useToggleFeePlan();

  async function handleRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: QueryKeys.feePlans(profile?.id ?? '', activeRole?.id ?? ''),
    });
    setRefreshing(false);
  }

  function handleToggle(plan: FeePlan) {
    togglePlan(
      { planId: plan.id, isActive: !plan.is_active },
      {
        onSuccess: () =>
          setToast({ message: plan.is_active ? 'Plan deactivated' : 'Plan activated', type: 'success', visible: true }),
        onError: () =>
          setToast({ message: t('errors.save_failed'), type: 'error', visible: true }),
      }
    );
  }

  function renderPlan({ item }: { item: FeePlan }) {
    const monthly = monthlyEquivalent(item);

    return (
      <View style={[styles.planCard, !item.is_active && styles.planCardInactive]}>
        <View style={styles.planRow}>
          <View style={styles.planLeft}>
            <View style={styles.amountRow}>
              <Text style={styles.planAmount}>₹{item.amount}</Text>
              <View style={[styles.cycleChip,
                item.cycle === 'quarterly' && styles.cycleChipQuarterly]}>
                <Text style={[styles.cycleChipText,
                  item.cycle === 'quarterly' && styles.cycleChipTextQuarterly]}>
                  {t(`fee.cycle_${item.cycle}` as any)}
                </Text>
              </View>
            </View>
            {item.cycle === 'quarterly' && (
              <Text style={styles.monthlyEquiv}>≈ ₹{monthly}/month</Text>
            )}
            <Text style={styles.startMonth}>
              {t('fee.start_month_label')}: {formatYearMonth(item.start_month)}
            </Text>
          </View>
          <Switch
            value={item.is_active}
            onValueChange={() => handleToggle(item)}
            trackColor={{ false: Colors.border, true: Colors.leaf }}
            thumbColor={Colors.white}
          />
        </View>
        {!item.is_active && (
          <View style={styles.inactiveBanner}>
            <Text style={styles.inactiveBannerText}>{t('status.inactive')}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <Toast message={toast.message} type={toast.type} visible={toast.visible}
        onHide={() => setToast((p) => ({ ...p, visible: false }))} />

      <AppHeader
        title={t('fee.plans_title')}
        role={activeRole?.role}
        rightElement={
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddSheet(true)}>
            <Text style={styles.addBtnText}>+ {t('buttons.add')}</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        renderItem={renderPlan}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.forest]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              emoji="💰"
              title={t('fee.no_pending')}
              actionLabel={`+ ${t('fee.add_plan')}`}
              onAction={() => setShowAddSheet(true)}
            />
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />

      <AddFeePlanSheet visible={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.cream },
  listContent: { padding: Spacing[4], paddingBottom: Spacing[10] },
  planCard: {
    backgroundColor: Colors.white, borderRadius: Radius.card,
    marginBottom: Spacing[3], overflow: 'hidden', ...Shadows.soft,
  },
  planCardInactive: { opacity: 0.65 },
  planRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: Spacing[4],
  },
  planLeft: { flex: 1, marginRight: Spacing[3] },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginBottom: Spacing[1] },
  planAmount: { fontSize: FontSize['2xl'], fontFamily: FontFamily.extraBold, color: Colors.forest },
  cycleChip: { backgroundColor: Colors.leafPale, paddingHorizontal: Spacing[2], paddingVertical: 2, borderRadius: Radius.full },
  cycleChipText: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.forest },
  cycleChipQuarterly: { backgroundColor: Colors.amberPale },
  cycleChipTextQuarterly: { color: '#7A5200' },
  monthlyEquiv: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.inkFaint, marginBottom: Spacing[1] },
  startMonth: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.inkMuted },
  inactiveBanner: { backgroundColor: Colors.creamDark, paddingHorizontal: Spacing[4], paddingVertical: Spacing[1] },
  inactiveBannerText: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.inkMuted },
  addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing[3], paddingVertical: Spacing[1], borderRadius: Radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  addBtnText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.white },
});
