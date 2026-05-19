import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';

import { useEducator } from '@/lib/educator-context';
import { useRole } from '@/lib/role-context';
import { useStudentDetail } from '@/hooks/useStudentDetail';
import { QueryKeys, AttendanceColors } from '@/lib/constants';
import { Colors, FontFamily, FontSize, Gradients, Radius, Spacing, Shadows } from '../../../theme';
import StudentAvatar from '@/components/StudentAvatar';

type Tab = 'overview' | 'attendance' | 'observations' | 'milestones' | 'academic';

export default function StudentDetailScreen() {
  const { id: childId } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useEducator();
  const { activeRole } = useRole();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading } = useStudentDetail(
    childId ?? null,
    profile?.id ?? null,
    activeRole?.id ?? null
  );

  async function handleRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: QueryKeys.studentDetail(childId ?? ''),
    });
    setRefreshing(false);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: t('students.detail.overview') },
    { key: 'attendance', label: t('students.detail.attendance') },
    { key: 'observations', label: t('students.detail.observations') },
    { key: 'milestones', label: t('students.detail.milestones') },
    { key: 'academic', label: t('students.detail.academic') },
  ];

  const child = data?.child;
  const name = child?.pet_name ?? 'Student';

  return (
    <View style={styles.flex}>
      {/* Header */}
      <LinearGradient
        colors={Gradients.header.colors}
        start={Gradients.header.start}
        end={Gradients.header.end}
        locations={Gradients.header.locations}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ {t('buttons.back')}</Text>
        </TouchableOpacity>
        <View style={styles.profileRow}>
          <StudentAvatar name={name} avatarUrl={child?.avatar_url} size="lg" />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{name}</Text>
            {child?.pet_name_hi && (
              <Text style={styles.profileNameHi}>{child.pet_name_hi}</Text>
            )}
            {data && (
              <Text style={styles.attendanceRate}>
                {data.attendanceRate}% {t('students.detail.attendance_rate')}
              </Text>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.forest]}
          />
        }
      >
        {isLoading ? (
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab data={data} t={t} />}
            {activeTab === 'attendance' && <AttendanceTab records={data?.attendance ?? []} t={t} />}
            {activeTab === 'observations' && <ObservationsTab items={data?.observations ?? []} t={t} />}
            {activeTab === 'milestones' && <MilestonesTab records={data?.milestoneRecords ?? []} t={t} />}
            {activeTab === 'academic' && <AcademicTab records={data?.academicRecords ?? []} t={t} />}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Tab Components ───────────────────────────────────────────────────────────

function OverviewTab({ data, t }: any) {
  const child = data?.child;
  if (!child) return <Text style={styles.emptyText}>{t('common.no_data')}</Text>;

  return (
    <View style={styles.card}>
      {child.dob && (
        <InfoRow label={t('students.detail.dob')} value={child.dob} />
      )}
      {child.gender && (
        <InfoRow label={t('students.detail.gender')} value={child.gender} />
      )}
      <InfoRow
        label={t('students.detail.attendance_rate')}
        value={`${data.attendanceRate}%`}
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function AttendanceTab({ records, t }: any) {
  if (!records.length) {
    return <Text style={styles.emptyText}>{t('common.no_data')}</Text>;
  }
  return (
    <View style={styles.card}>
      {records.map((r: any) => {
        const colors = AttendanceColors[r.status] ?? AttendanceColors.present;
        return (
          <View key={r.id} style={styles.attendanceRow}>
            <View style={[styles.attendanceDot, { backgroundColor: colors.dot }]} />
            <Text style={styles.attendanceDate}>{r.date}</Text>
            <View style={[styles.statusChip, { backgroundColor: colors.bg }]}>
              <Text style={[styles.statusChipText, { color: colors.text }]}>
                {t(`attendance_status.${r.status}`)}
              </Text>
            </View>
            {r.note && <Text style={styles.attendanceNote} numberOfLines={1}>{r.note}</Text>}
          </View>
        );
      })}
    </View>
  );
}

function ObservationsTab({ items, t }: any) {
  if (!items.length) {
    return <Text style={styles.emptyText}>{t('observations.empty')}</Text>;
  }
  return (
    <View>
      {items.map((o: any) => (
        <View key={o.id} style={styles.card}>
          <View style={styles.obsHeader}>
            {o.category && (
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{o.category}</Text>
              </View>
            )}
            <Text style={styles.obsDate}>
              {new Date(o.created_at).toLocaleDateString('en-IN')}
            </Text>
          </View>
          <Text style={styles.obsNote}>{o.note}</Text>
        </View>
      ))}
    </View>
  );
}

function MilestonesTab({ records, t }: any) {
  if (!records.length) {
    return <Text style={styles.emptyText}>{t('milestones.empty')}</Text>;
  }
  return (
    <View>
      {records.map((m: any) => (
        <View key={m.id} style={styles.card}>
          <View style={styles.obsHeader}>
            <Text style={styles.milestoneTitle}>{m.milestone_title}</Text>
            <View style={[
              styles.statusChip,
              m.status === 'achieved' && { backgroundColor: Colors.leafPale },
              m.status === 'in_progress' && { backgroundColor: Colors.amberPale },
            ]}>
              <Text style={[
                styles.statusChipText,
                m.status === 'achieved' && { color: Colors.forest },
                m.status === 'in_progress' && { color: '#7A5200' },
              ]}>
                {t(`milestone_status.${m.status}`)}
              </Text>
            </View>
          </View>
          {m.note && <Text style={styles.obsNote}>{m.note}</Text>}
        </View>
      ))}
    </View>
  );
}

function AcademicTab({ records, t }: any) {
  if (!records.length) {
    return <Text style={styles.emptyText}>{t('students.detail.no_academic_records')}</Text>;
  }
  return (
    <View style={styles.card}>
      {records.map((r: any) => (
        <View key={r.id} style={styles.academicRow}>
          <View style={styles.academicLeft}>
            <Text style={styles.academicSubject}>{r.subject ?? '—'}</Text>
            {r.term && <Text style={styles.academicTerm}>{r.term}</Text>}
          </View>
          <Text style={styles.academicScore}>
            {r.score ?? '—'}{r.max_score ? `/${r.max_score}` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.cream },
  header: { paddingTop: 52, paddingBottom: Spacing[4], paddingHorizontal: Spacing[5] },
  backBtn: { marginBottom: Spacing[3] },
  backBtnText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: 'rgba(255,255,255,0.85)' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[4] },
  profileInfo: { flex: 1 },
  profileName: { fontSize: FontSize.xl, fontFamily: FontFamily.extraBold, color: Colors.white },
  profileNameHi: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.75)' },
  attendanceRate: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.leaf, marginTop: Spacing[1] },

  tabBar: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border, maxHeight: 48 },
  tabBarContent: { paddingHorizontal: Spacing[3], gap: Spacing[1] },
  tab: { paddingHorizontal: Spacing[3], paddingVertical: Spacing[3], borderBottomWidth: 2, borderBottomColor: Colors.transparent },
  tabActive: { borderBottomColor: Colors.forest },
  tabText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.inkMuted },
  tabTextActive: { color: Colors.forest },

  scroll: { flex: 1 },
  content: { padding: Spacing[4], paddingBottom: Spacing[10] },
  loadingText: { textAlign: 'center', color: Colors.inkFaint, fontFamily: FontFamily.regular, marginTop: Spacing[8] },
  emptyText: { textAlign: 'center', color: Colors.inkFaint, fontFamily: FontFamily.regular, marginTop: Spacing[8] },

  card: { backgroundColor: Colors.white, borderRadius: Radius.card, padding: Spacing[4], marginBottom: Spacing[3], ...Shadows.soft },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing[2], borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.inkMuted },
  infoValue: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.ink },

  attendanceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[2], gap: Spacing[2], borderBottomWidth: 1, borderBottomColor: Colors.border },
  attendanceDot: { width: 8, height: 8, borderRadius: 4 },
  attendanceDate: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.ink, flex: 1 },
  attendanceNote: { fontSize: FontSize.xs, color: Colors.inkFaint, flex: 1 },

  statusChip: { paddingHorizontal: Spacing[2], paddingVertical: 2, borderRadius: Radius.full, backgroundColor: Colors.leafPale },
  statusChipText: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.forest },

  obsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[2] },
  obsDate: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.inkFaint },
  obsNote: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.ink, lineHeight: 20 },
  categoryChip: { backgroundColor: Colors.creamDark, paddingHorizontal: Spacing[2], paddingVertical: 2, borderRadius: Radius.full },
  categoryChipText: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.inkMuted },

  milestoneTitle: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.ink, flex: 1 },
  academicRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing[2], borderBottomWidth: 1, borderBottomColor: Colors.border },
  academicLeft: { flex: 1 },
  academicSubject: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.ink },
  academicTerm: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.inkFaint },
  academicScore: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.forest },
});
