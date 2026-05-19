import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useEducator } from '@/lib/educator-context';
import { useRole } from '@/lib/role-context';
import { useCreateClass, useUpdateClass } from '@/hooks/useClasses';
import { SUBJECTS, GRADES } from '@/lib/constants';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../../theme';
import TextInput from '@/components/ui/TextInput';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Toast from '@/components/ui/Toast';
import type { EducatorClass } from '@/types/database';

interface Props {
  visible: boolean;
  editingClass?: EducatorClass | null;
  onClose: () => void;
}

export default function ClassFormSheet({ visible, editingClass, onClose }: Props) {
  const { t } = useTranslation();
  const { profile } = useEducator();
  const { activeRole } = useRole();
  const { mutateAsync: createClass } = useCreateClass();
  const { mutateAsync: updateClass } = useUpdateClass();

  const isEditing = !!editingClass;

  const [name, setName] = useState('');
  const [subject, setSubject] = useState<string | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [schedule, setSchedule] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', visible: false });

  // Pre-fill when editing
  useEffect(() => {
    if (editingClass) {
      setName(editingClass.name);
      setSubject(editingClass.subject ?? null);
      setGrade(editingClass.grade ?? null);
      setSchedule(typeof editingClass.schedule === 'string' ? editingClass.schedule : '');
    } else {
      setName(''); setSubject(null); setGrade(null); setSchedule('');
    }
    setErrors({});
  }, [editingClass, visible]);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('errors.required_field');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate() || !profile || !activeRole) return;
    setSaving(true);
    try {
      if (isEditing && editingClass) {
        await updateClass({
          classId: editingClass.id,
          name: name.trim(),
          subject,
          grade,
          schedule: schedule.trim() || null,
        });
      } else {
        await createClass({
          educatorId: profile.id,
          roleInstanceId: activeRole.id,
          name: name.trim(),
          subject,
          grade,
          schedule: schedule.trim() || null,
        });
      }
      setToast({ message: t('classes.saving'), type: 'success', visible: true });
      setTimeout(handleClose, 1000);
    } catch {
      setToast({ message: t('errors.save_failed'), type: 'error', visible: true });
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setName(''); setSubject(null); setGrade(null); setSchedule(''); setErrors({});
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <Toast message={toast.message} type={toast.type} visible={toast.visible}
            onHide={() => setToast((p) => ({ ...p, visible: false }))} />
          <View style={styles.handle} />
          <Text style={styles.title}>
            {isEditing ? t('classes.edit') : t('classes.add')}
          </Text>

          {/* Class name */}
          <TextInput
            label={t('classes.name_label')}
            placeholder={t('classes.name_placeholder')}
            value={name}
            onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: '' })); }}
            error={errors.name}
            required
          />

          {/* Subject picker */}
          <Text style={styles.label}>{t('classes.subject_label')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
            {SUBJECTS.map((s) => (
              <TouchableOpacity key={s}
                style={[styles.chip, subject === s && styles.chipSelected]}
                onPress={() => setSubject(subject === s ? null : s)}>
                <Text style={[styles.chipText, subject === s && styles.chipTextSelected]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Grade picker */}
          <Text style={styles.label}>{t('classes.grade_label')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
            {GRADES.map((g) => (
              <TouchableOpacity key={g}
                style={[styles.chip, grade === g && styles.chipSelected]}
                onPress={() => setGrade(grade === g ? null : g)}>
                <Text style={[styles.chipText, grade === g && styles.chipTextSelected]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Schedule */}
          <TextInput
            label={t('classes.schedule_label')}
            placeholder={t('classes.schedule_placeholder')}
            value={schedule}
            onChangeText={setSchedule}
          />

          <PrimaryButton
            label={saving ? t('classes.saving') : t('buttons.save')}
            loading={saving}
            onPress={handleSave}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet, padding: Spacing[5],
    paddingBottom: Spacing[8], maxHeight: '90%', ...Shadows.sheet,
  },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing[4] },
  title: { fontSize: FontSize.xl, fontFamily: FontFamily.extraBold, color: Colors.ink, marginBottom: Spacing[4] },
  label: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.ink, marginBottom: Spacing[2] },
  chipScroll: { maxHeight: 44, marginBottom: Spacing[3] },
  chipRow: { gap: Spacing[2], paddingRight: Spacing[2] },
  chip: { paddingHorizontal: Spacing[3], paddingVertical: Spacing[1] + 2, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  chipSelected: { borderColor: Colors.forest, backgroundColor: Colors.leafPale },
  chipText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.inkMuted },
  chipTextSelected: { color: Colors.forest },
});
