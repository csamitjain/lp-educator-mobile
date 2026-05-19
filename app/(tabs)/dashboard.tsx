import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

import { useEducator } from '@/lib/educator-context';
import { useRole } from '@/lib/role-context';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import { QueryKeys, roleHasFee } from '@/lib/constants';
import { Colors, FontFamily, FontSize, Gradients, Radius, Spacing, Shadows } from '../../theme';
import AppHeader from '@/components/AppHeader';
import StatCard from '@/components/dashboard/StatCard';
import QuickActionGrid from '@/components/dashboard/QuickActionGrid';
import RecentActivity from '@/components/dashboard/RecentActivity';
import RoleBadge from '@/components/RoleBadge';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useEducator();
  const { activeRole, roleInstances, setActiveRole, hasFee } = useRole();

  const [refreshing, setRefreshing] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const { data: stats, isLoading: statsLoading } = useDashboardStats(profile, activeRole);
  const { data: activity = [], isLoading: activityLoading } = useRecentActivity(profile, activeRole);

  async function handleRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: QueryKeys.dashboardStats(profile?.id ?? '', activeRole?.id ?? ''),
    });
    setRefreshing(false);
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? '';

  return (
    <View style={styles.flex}>
      {/* Header */}
      <AppHeader
        title={t('dashboard.greeting', { name: firstName })}
        role={activeRole?.role ?? null}
        rightElement={
          roleInstances.length > 1 ? (
            <TouchableOpacity
              onPress={() => setShowRoleSwitcher(true)}
              style={styles.switcherBtn}
            >
              <Text style={styles.switcherText}>⇄</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Verification banner */}
      {profile && !profile.is_verified && (
        <View style={styles.verificationBanner}>
          <Text style={styles.verificationText}>
            ⚠️ {t('verification_banner.title')}
          </Text>
          <Text style={styles.verificationSubtext}>
            {t('verification_banner.body')}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.forest}
            colors={[Colors.forest]}
          />
        }
      >
        {/* Stat Cards */}
        <View style={styles.statsGrid}>
          <StatCard
            label={t('dashboard.stat.students')}
            value={statsLoading ? '—' : stats?.studentCount ?? 0}
            emoji="👥"
            gradientColors={Gradients.leafCard.colors}
          />
          <StatCard
            label={t('dashboard.stat.present_today')}
            value={statsLoading ? '—' : stats?.presentToday ?? 0}
            emoji="✅"
            gradientColors={Gradients.leafCard.colors}
          />
          <StatCard
            label={t('dashboard.stat.classes')}
            value={statsLoading ? '—' : stats?.classCount ?? 0}
            emoji="🏫"
            gradientColors={Gradients.amberCard.colors}
          />
          {hasFee ? (
            <StatCard
              label={t('dashboard.stat.fee_pending')}
              value={statsLoading ? '—' : stats?.feePending ?? 0}
              emoji="💰"
              gradientColors={Gradients.terraCard.colors}
            />
          ) : (
            <StatCard
              label={t('dashboard.stat.observations')}
              value={statsLoading ? '—' : stats?.observationCount ?? 0}
              emoji="📝"
              gradientColors={Gradients.terraCard.colors}
            />
          )}
        </View>

        {/* Quick Actions */}
        <QuickActionGrid role={activeRole?.role ?? null} />

        {/* Recent Activity */}
        <RecentActivity items={activity} isLoading={activityLoading} />
      </ScrollView>

      {/* Role Switcher Modal */}
      <Modal
        visible={showRoleSwitcher}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRoleSwitcher(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowRoleSwitcher(false)}
          activeOpacity={1}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{t('dashboard.role_switcher')}</Text>
            {roleInstances.map((instance) => (
              <TouchableOpacity
                key={instance.id}
                style={[
                  styles.roleOption,
                  activeRole?.id === instance.id && styles.roleOptionActive,
                ]}
                onPress={() => {
                  setActiveRole(instance.id);
                  setShowRoleSwitcher(false);
                }}
              >
                <RoleBadge role={instance.role} />
                {instance.institution_name && (
                  <Text style={styles.institutionName} numberOfLines={1}>
                    {instance.institution_name}
                  </Text>
                )}
                {activeRole?.id === instance.id && (
                  <Text style={styles.activeCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flex: 1 },
  content: {
    padding: Spacing[4],
    paddingBottom: Spacing[10],
  },

  // Verification banner
  verificationBanner: {
    backgroundColor: Colors.amberPale,
    borderBottomWidth: 1,
    borderBottomColor: Colors.amber,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  verificationText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: '#7A5200',
  },
  verificationSubtext: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: '#7A5200',
    marginTop: 2,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing[5],
    gap: Spacing[2],
  },

  // Role switcher button in header
  switcherBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  switcherText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
  },

  // Role switcher modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    padding: Spacing[5],
    paddingBottom: Spacing[8],
    ...Shadows.sheet,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.extraBold,
    color: Colors.ink,
    marginBottom: Spacing[4],
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.md,
    marginBottom: Spacing[2],
    gap: Spacing[3],
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  roleOptionActive: {
    borderColor: Colors.forest,
    backgroundColor: Colors.leafPale,
  },
  institutionName: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.inkMuted,
  },
  activeCheck: {
    fontSize: FontSize.md,
    color: Colors.forest,
    fontFamily: FontFamily.bold,
  },
});
