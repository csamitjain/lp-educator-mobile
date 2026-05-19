import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEducator } from '@/lib/educator-context';
import { useRole } from '@/lib/role-context';
import {
  useClasses, useDeleteClass, useClassRoster,
} from '@/hooks/useClasses';
import { QueryKeys } from '@/lib/constants';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../theme';
import AppHeader from '@/components/AppHeader';
import StudentAvatar from '@/components/StudentAvatar';
import EmptyState from '@/components/EmptyState';
import ClassFormSheet from '@/components/sheets/ClassFormSheet';
import Toast from '@/components/ui/Toast';
import type { EducatorClass } from '@/types/database';

export default function ClassesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useEducator();
  const { activeRole } = useRole();

  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<EducatorClass | null>(null);
  const [rosterClassId, setRosterClassId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', visible: false });

  const { data: classes = [], isLoading } = useClasses(profile, activeRole);
  const { mutateAsync: deleteClass } = useDeleteClass();
  const { data: roster = [], isLoading: rosterLoading } = useClassRoster(rosterClassId, profile?.id ?? null);

  async function handleRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: QueryKeys.classes(profile?.id ?? '', activeRole?.id ?? ''),
    });
    setRefreshing(false);
  }

  function handleEdit(cls: EducatorClass) {
    setEditingClass(cls);
    setShowForm(true);
  }

  function handleDelete(cls: EducatorClass) {
    Alert.alert(
      t('classes.delete_confirm'),
      cls.name,
      [
        { text: t('buttons.cancel'), style: 'cancel' },
        {
          text: t('buttons.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClass(cls.id);
              setToast({ message: `"${cls.name}" deleted`, type: 'success', visible: true });
              if (rosterClassId === cls.id) setRosterClassId(null);
            } catch {
              setToast({ message: t('errors.save_failed'), type: 'error', visible: true });
            }
          },
        },
      ]
    );
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingClass(null);
  }

  // ─── Class card ──────────────────────────────────────────────────────────────

  function renderClass({ item }: { item: EducatorClass }) {
    const isRosterOpen = rosterClassId === item.id;

    return (
      <View style={styles.classCard}>
        {/* Header row */}
        <View style={styles.classHeader}>
          <TouchableOpacity
            style={styles.classTitleRow}
            onPress={() => setRosterClassId(isRosterOpen ? null : item.id)}
            activeOpacity={0.75}
          >
            <View style={styles.classTitleLeft}>
              <Text style={styles.className}>{item.name}</Text>
              <View style={styles.classMeta}>
                {item.subject && (
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipText}>{item.subject}</Text>
                  </View>
                )}
                {item.grade && (
                  <View style={[styles.metaChip, styles.gradeChip]}>
                    <Text style={[styles.metaChipText, styles.gradeChipText]}>{item.grade}</Text>
                  </View>
                )}
              </View>
              {item.schedule && (
                <Text style={styles.schedule}>🕐 {item.schedule}</Text>
              )}
            </View>
            <Text style={styles.chevron}>{isRosterOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.classActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
              <Text style={styles.actionBtnText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
              <Text style={styles.actionBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Roster section */}
        {isRosterOpen && (
          <View style={styles.rosterSection}>
            <Text style={styles.rosterTitle}>{t('classes.roster_title')}</Text>
            {rosterLoading ? (
              <Text style={styles.rosterEmpty}>{t('common.loading')}</Text>
            ) : roster.length === 0 ? (
              <Text style={styles.rosterEmpty}>{t('common.no_data')}</Text>
            ) : (
              <>
                <Text style={styles.rosterCount}>
                  {t('classes.student_count', { count: roster.length })}
                </Text>
                <View style={styles.rosterAvatars}>
                  {roster.slice(0, 8).map((s) => (
                    <View key={s.childId} style={styles.rosterStudent}>
                      <StudentAvatar name={s.name} avatarUrl={s.avatarUrl} size="sm" />
                      <Text style={styles.rosterStudentName} numberOfLines={1}>{s.name}</Text>
                    </View>
                  ))}
                  {roster.length > 8 && (
                    <View style={styles.moreStudents}>
                      <Text style={styles.moreStudentsText}>+{roster.length - 8}</Text>
                    </View>
                  )}
                </View>
              </>
            )}
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
        title={t('classes.title')}
        role={activeRole?.role}
        rightElement={
          <TouchableOpacity style={styles.addBtn} onPress={() => { setEditingClass(null); setShowForm(true); }}>
            <Text style={styles.addBtnText}>+ {t('buttons.add')}</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={renderClass}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.forest]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              emoji="🏫"
              title={t('classes.empty')}
              actionLabel={`+ ${t('classes.add')}`}
              onAction={() => setShowForm(true)}
            />
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />

      <ClassFormSheet
        visible={showForm}
        editingClass={editingClass}
        onClose={handleCloseForm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.cream },
  listContent: { padding: Spacing[4], paddingBottom: Spacing[10] },

  classCard: {
    backgroundColor: Colors.white, borderRadius: Radius.card,
    marginBottom: Spacing[3], overflow: 'hidden', ...Shadows.soft,
  },
  classHeader: { padding: Spacing[4] },
  classTitleRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: Spacing[2],
  },
  classTitleLeft: { flex: 1, marginRight: Spacing[3] },
  className: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.ink, marginBottom: Spacing[1] },
  classMeta: { flexDirection: 'row', gap: Spacing[2], flexWrap: 'wrap', marginBottom: Spacing[1] },
  metaChip: {
    backgroundColor: Colors.leafPale, paddingHorizontal: Spacing[2],
    paddingVertical: 2, borderRadius: Radius.full,
  },
  metaChipText: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.forest },
  gradeChip: { backgroundColor: Colors.amberPale },
  gradeChipText: { color: '#7A5200' },
  schedule: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.inkFaint },
  chevron: { fontSize: FontSize.sm, color: Colors.inkFaint, marginTop: 2 },

  classActions: { flexDirection: 'row', gap: Spacing[2] },
  actionBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.creamDark, alignItems: 'center', justifyContent: 'center',
  },
  actionBtnText: { fontSize: 16 },

  // Roster
  rosterSection: {
    borderTopWidth: 1, borderTopColor: Colors.border,
    padding: Spacing[4], backgroundColor: Colors.cream,
  },
  rosterTitle: { fontSize: FontSize.xs, fontFamily: FontFamily.bold, color: Colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing[2] },
  rosterCount: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.forest, marginBottom: Spacing[3] },
  rosterEmpty: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.inkFaint },
  rosterAvatars: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[3] },
  rosterStudent: { alignItems: 'center', width: 52 },
  rosterStudentName: { fontSize: 10, fontFamily: FontFamily.regular, color: Colors.inkMuted, marginTop: 3, textAlign: 'center' },
  moreStudents: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.leafPale,
    alignItems: 'center', justifyContent: 'center',
  },
  moreStudentsText: { fontSize: FontSize.xs, fontFamily: FontFamily.bold, color: Colors.forest },

  addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing[3], paddingVertical: Spacing[1], borderRadius: Radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  addBtnText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.white },
});
