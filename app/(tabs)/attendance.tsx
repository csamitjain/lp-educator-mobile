import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

import { useEducator } from '@/lib/educator-context';
import { useRole } from '@/lib/role-context';
import {
  useAttendance,
  useUpsertAttendance,
  useBulkUpsertAttendance,
  type AttendanceRow,
} from '@/hooks/useAttendance';
import { QueryKeys } from '@/lib/constants';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../theme';
import AppHeader from '@/components/AppHeader';
import AttendanceStatusButton from '@/components/attendance/AttendanceStatusButton';
import BulkMarkSheet from '@/components/sheets/BulkMarkSheet';
import EmptyState from '@/components/EmptyState';
import Toast from '@/components/ui/Toast';
import type { AttendanceStatus } from '@/types/database';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// Simple date navigator — prev/next day arrows
function DateNavigator({
  date,
  onPrev,
  onNext,
  onToday,
}: {
  date: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  const { t } = useTranslation();
  const isToday = date === todayStr();

  return (
    <View style={dateStyles.container}>
      <TouchableOpacity onPress={onPrev} style={dateStyles.arrow}>
        <Text style={dateStyles.arrowText}>‹</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onToday} style={dateStyles.dateBtn}>
        <Text style={dateStyles.dateText}>{formatDisplayDate(date)}</Text>
        {isToday && (
          <View style={dateStyles.todayBadge}>
            <Text style={dateStyles.todayBadgeText}>{t('attendance.today')}</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onNext}
        style={[dateStyles.arrow, isToday && dateStyles.arrowDisabled]}
        disabled={isToday}
      >
        <Text style={[dateStyles.arrowText, isToday && dateStyles.arrowTextDisabled]}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const dateStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  arrow: { padding: Spacing[2] },
  arrowText: { fontSize: 24, color: Colors.forest, fontWeight: '600' },
  arrowDisabled: { opacity: 0.3 },
  arrowTextDisabled: { color: Colors.inkFaint },
  dateBtn: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing[2],
  },
  dateText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
    color: Colors.ink,
  },
  todayBadge: {
    backgroundColor: Colors.leafPale,
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  todayBadgeText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.forest,
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AttendanceScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useEducator();
  const { activeRole } = useRole();

  const [date, setDate] = useState(todayStr());
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [showBulkSheet, setShowBulkSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [localStatuses, setLocalStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({
    message: '',
    type: 'success' as 'success' | 'error',
    visible: false,
  });

  const { data: rows = [], isLoading } = useAttendance(profile, activeRole, date, classFilter);
  const { mutateAsync: upsertOne } = useUpsertAttendance();
  const { mutateAsync: upsertBulk } = useBulkUpsertAttendance();

  // Unique classes for filter
  const classOptions = [...new Set(rows.filter((r) => r.className).map((r) => r.className as string))];

  function getStatus(row: AttendanceRow): AttendanceStatus | null {
    return localStatuses[row.childId] !== undefined
      ? localStatuses[row.childId]
      : row.status;
  }

  function handleStatusChange(childId: string, next: AttendanceStatus) {
    setLocalStatuses((prev) => ({ ...prev, [childId]: next }));
  }

  function handleMarkAllPresent() {
    const updates: Record<string, AttendanceStatus> = {};
    rows.forEach((r) => { updates[r.childId] = 'present'; });
    setLocalStatuses((prev) => ({ ...prev, ...updates }));
  }

  function handleMarkAllAbsent() {
    const updates: Record<string, AttendanceStatus> = {};
    rows.forEach((r) => { updates[r.childId] = 'absent'; });
    setLocalStatuses((prev) => ({ ...prev, ...updates }));
  }

  async function handleSave() {
    if (!profile || !activeRole) return;
    setSaving(true);

    try {
      const changed = rows.filter(
        (r) => localStatuses[r.childId] !== undefined && localStatuses[r.childId] !== r.status
      );

      if (changed.length === 0) {
        // Save all with current status
        const all = rows.map((r) => ({
          childId: r.childId,
          classId: r.classId,
          status: getStatus(r) ?? 'present',
          note: r.note,
        }));

        await upsertBulk({
          records: all,
          educatorId: profile.id,
          roleInstanceId: activeRole.id,
          date,
        });
      } else {
        // Only save changed rows
        await upsertBulk({
          records: changed.map((r) => ({
            childId: r.childId,
            classId: r.classId,
            status: localStatuses[r.childId],
            note: r.note,
          })),
          educatorId: profile.id,
          roleInstanceId: activeRole.id,
          date,
        });
      }

      setLocalStatuses({});
      setToast({ message: t('attendance.saved'), type: 'success', visible: true });
    } catch {
      setToast({ message: t('errors.save_failed'), type: 'error', visible: true });
    } finally {
      setSaving(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setLocalStatuses({});
    await queryClient.invalidateQueries({
      queryKey: QueryKeys.attendance(profile?.id ?? '', activeRole?.id ?? '', date),
    });
    setRefreshing(false);
  }

  function goToPrevDay() {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split('T')[0]);
    setLocalStatuses({});
  }

  function goToNextDay() {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    const next = d.toISOString().split('T')[0];
    if (next <= todayStr()) {
      setDate(next);
      setLocalStatuses({});
    }
  }

  // Summary counts
  const summary = rows.reduce(
    (acc, row) => {
      const s = getStatus(row);
      if (s === 'present') acc.present++;
      else if (s === 'absent') acc.absent++;
      else if (s === 'late') acc.late++;
      return acc;
    },
    { present: 0, absent: 0, late: 0 }
  );

  const hasUnsaved = Object.keys(localStatuses).length > 0;

  function renderRow({ item }: { item: AttendanceRow }) {
    const status = getStatus(item);
    return (
      <View style={styles.studentRow}>
        <View style={styles.studentLeft}>
          <Text style={styles.studentName}>{item.name}</Text>
          {item.nameHi && (
            <Text style={styles.studentNameHi}>{item.nameHi}</Text>
          )}
          {item.className && (
            <Text style={styles.className}>{item.className}</Text>
          )}
        </View>
        <AttendanceStatusButton
          status={status}
          onPress={(next) => handleStatusChange(item.childId, next)}
        />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast((p) => ({ ...p, visible: false }))}
      />

      <AppHeader title={t('attendance.title')} role={activeRole?.role} />

      {/* Date navigator */}
      <DateNavigator
        date={date}
        onPrev={goToPrevDay}
        onNext={goToNextDay}
        onToday={() => { setDate(todayStr()); setLocalStatuses({}); }}
      />

      {/* Class filter */}
      {classOptions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.classFilterBar}
          contentContainerStyle={styles.classFilterContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, !classFilter && styles.filterChipActive]}
            onPress={() => setClassFilter(null)}
          >
            <Text style={[styles.filterChipText, !classFilter && styles.filterChipTextActive]}>
              {t('attendance.all_students')}
            </Text>
          </TouchableOpacity>
          {classOptions.map((cls) => (
            <TouchableOpacity
              key={cls}
              style={[styles.filterChip, classFilter === cls && styles.filterChipActive]}
              onPress={() => setClassFilter(classFilter === cls ? null : cls)}
            >
              <Text style={[styles.filterChipText, classFilter === cls && styles.filterChipTextActive]}>
                {cls}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Summary bar */}
      {rows.length > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryItem}>
            🟢 {t('attendance.summary.present', { count: summary.present })}
          </Text>
          <Text style={styles.summaryItem}>
            🔴 {t('attendance.summary.absent', { count: summary.absent })}
          </Text>
          <Text style={styles.summaryItem}>
            🟡 {t('attendance.summary.late', { count: summary.late })}
          </Text>
          <TouchableOpacity onPress={() => setShowBulkSheet(true)}>
            <Text style={styles.bulkBtn}>{t('buttons.bulk_mark')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={rows}
        keyExtractor={(item) => item.childId}
        renderItem={renderRow}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.forest]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState emoji="✅" title={t('attendance.no_students')} />
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Save button — sticky at bottom */}
      {rows.length > 0 && (
        <View style={styles.saveContainer}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving
                ? t('attendance.saving')
                : hasUnsaved
                ? `${t('attendance.save')} (${Object.keys(localStatuses).length})`
                : t('attendance.save')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <BulkMarkSheet
        visible={showBulkSheet}
        totalCount={rows.length}
        onMarkAllPresent={handleMarkAllPresent}
        onMarkAllAbsent={handleMarkAllAbsent}
        onClose={() => setShowBulkSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.cream },
  listContent: { paddingBottom: 100 },

  classFilterBar: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    maxHeight: 44,
  },
  classFilterContent: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  filterChipActive: { borderColor: Colors.forest, backgroundColor: Colors.leafPale },
  filterChipText: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.inkMuted },
  filterChipTextActive: { color: Colors.forest },

  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing[3],
    flexWrap: 'wrap',
  },
  summaryItem: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.inkMuted,
  },
  bulkBtn: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    color: Colors.forest,
    marginLeft: 'auto',
  },

  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing[4],
    marginTop: Spacing[2],
    borderRadius: Radius.card,
    padding: Spacing[3],
    ...Shadows.soft,
  },
  studentLeft: { flex: 1 },
  studentName: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
    color: Colors.ink,
  },
  studentNameHi: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.inkMuted,
    marginTop: 1,
  },
  className: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: Colors.inkFaint,
    marginTop: 1,
  },

  saveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing[4],
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.sheet,
  },
  saveBtn: {
    backgroundColor: Colors.forest,
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
});
