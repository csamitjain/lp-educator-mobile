import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

import { useEducator } from '@/lib/educator-context';
import { useRole } from '@/lib/role-context';
import { useStudents, useUpdateApproval } from '@/hooks/useStudents';
import { QueryKeys } from '@/lib/constants';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../../theme';
import AppHeader from '@/components/AppHeader';
import StudentAvatar from '@/components/StudentAvatar';
import EmptyState from '@/components/EmptyState';
import AddStudentSheet from '@/components/sheets/AddStudentSheet';
import Toast from '@/components/ui/Toast';
import type { StudentRow } from '@/hooks/useStudents';

export default function StudentsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useEducator();
  const { activeRole } = useRole();

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({
    message: '',
    type: 'success' as 'success' | 'error',
    visible: false,
  });

  const { data: students = [], isLoading } = useStudents(profile, activeRole);
  const { mutate: updateApproval } = useUpdateApproval();

  const classOptions = useMemo(() => {
    const names = students
      .filter((s) => s.className)
      .map((s) => s.className as string);
    return [...new Set(names)];
  }, [students]);

  const pending = students.filter((s) => s.approvalStatus === 'pending');
  const approved = useMemo(() => {
    return students
      .filter((s) => s.approvalStatus === 'approved')
      .filter((s) => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
        const matchesClass = !classFilter || s.className === classFilter;
        return matchesSearch && matchesClass;
      });
  }, [students, search, classFilter]);

  async function handleRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: QueryKeys.students(profile?.id ?? '', activeRole?.id ?? ''),
    });
    setRefreshing(false);
  }

  function handleApprove(student: StudentRow) {
    updateApproval(
      { educatorStudentId: student.id, status: 'approved' },
      {
        onSuccess: () =>
          setToast({ message: t('students.approval.approved_toast'), type: 'success', visible: true }),
        onError: () =>
          setToast({ message: t('errors.save_failed'), type: 'error', visible: true }),
      }
    );
  }

  function handleReject(student: StudentRow) {
    updateApproval(
      { educatorStudentId: student.id, status: 'rejected' },
      {
        onSuccess: () =>
          setToast({ message: t('students.approval.rejected_toast'), type: 'success', visible: true }),
        onError: () =>
          setToast({ message: t('errors.save_failed'), type: 'error', visible: true }),
      }
    );
  }

  function renderPendingCard(student: StudentRow) {
    return (
      <View key={student.id} style={styles.pendingCard}>
        <StudentAvatar name={student.name} avatarUrl={student.avatarUrl} size="md" />
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{student.name}</Text>
          {student.nameHi && (
            <Text style={styles.studentNameHi}>{student.nameHi}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(student)}>
          <Text style={styles.rejectBtnText}>{t('buttons.reject')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(student)}>
          <Text style={styles.approveBtnText}>{t('buttons.approve')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderStudentRow({ item }: { item: StudentRow }) {
    return (
      <TouchableOpacity
        style={styles.studentCard}
        onPress={() => router.push(`/(tabs)/students/${item.childId}` as any)}
        activeOpacity={0.75}
      >
        <StudentAvatar name={item.name} avatarUrl={item.avatarUrl} size="md" />
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.name}</Text>
          {item.nameHi && (
            <Text style={styles.studentNameHi}>{item.nameHi}</Text>
          )}
          {item.className && (
            <View style={styles.classChip}>
              <Text style={styles.classChipText}>{item.className}</Text>
            </View>
          )}
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
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

      <AppHeader
        title={t('students.title')}
        role={activeRole?.role}
        rightElement={
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddSheet(true)}>
            <Text style={styles.addBtnText}>+ {t('buttons.add')}</Text>
          </TouchableOpacity>
        }
      />

      {/* Search bar */}
      <View style={styles.filterRow}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('students.search_placeholder')}
          placeholderTextColor={Colors.inkFaint}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Class filter chips */}
      {classOptions.length > 0 && (
        <View style={styles.classFilterRow}>
          <TouchableOpacity
            style={[styles.filterChip, !classFilter && styles.filterChipActive]}
            onPress={() => setClassFilter(null)}
          >
            <Text style={[styles.filterChipText, !classFilter && styles.filterChipTextActive]}>
              {t('students.all_classes')}
            </Text>
          </TouchableOpacity>
          {classOptions.map((cls) => (
            <TouchableOpacity
              key={cls}
              style={[styles.filterChip, classFilter === cls && styles.filterChipActive]}
              onPress={() => setClassFilter(classFilter === cls ? null : cls)}
            >
              <Text
                style={[styles.filterChipText, classFilter === cls && styles.filterChipTextActive]}
              >
                {cls}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={approved}
        keyExtractor={(item) => item.id}
        renderItem={renderStudentRow}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.forest]}
          />
        }
        ListHeaderComponent={
          <>
            {pending.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('students.pending_section')}</Text>
                {pending.map(renderPendingCard)}
              </View>
            )}
            {approved.length > 0 && (
              <Text style={styles.sectionTitle}>{t('students.approved_section')}</Text>
            )}
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              emoji="👥"
              title={t('students.empty')}
              actionLabel={`+ ${t('students.add.title')}`}
              onAction={() => setShowAddSheet(true)}
            />
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />

      <AddStudentSheet visible={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.cream },
  listContent: { paddingBottom: Spacing[10] },
  filterRow: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.ink,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  classFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexWrap: 'wrap',
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
  section: { paddingHorizontal: Spacing[4], paddingTop: Spacing[4] },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: Colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing[2],
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[4],
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.amberPale,
    borderRadius: Radius.card,
    padding: Spacing[3],
    marginBottom: Spacing[2],
    borderWidth: 1,
    borderColor: Colors.amber,
    gap: Spacing[2],
  },
  approveBtn: {
    backgroundColor: Colors.forest,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1] + 2,
    borderRadius: Radius.md,
  },
  approveBtnText: { fontSize: FontSize.xs, fontFamily: FontFamily.bold, color: Colors.white },
  rejectBtn: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1] + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.terra,
  },
  rejectBtnText: { fontSize: FontSize.xs, fontFamily: FontFamily.bold, color: Colors.terra },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    borderRadius: Radius.card,
    padding: Spacing[3],
    gap: Spacing[3],
    ...Shadows.soft,
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.ink },
  studentNameHi: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.inkMuted, marginTop: 2 },
  classChip: {
    marginTop: Spacing[1],
    alignSelf: 'flex-start',
    backgroundColor: Colors.leafPale,
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  classChipText: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.forest },
  chevron: { fontSize: 22, color: Colors.inkFaint },
  addBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  addBtnText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.white },
});
