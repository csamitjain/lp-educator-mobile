import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useEducator } from '@/lib/educator-context';
import { useRole } from '@/lib/role-context';
import { useStudents } from '@/hooks/useStudents';
import { useAddObservation } from '@/hooks/useObservations';
import { OBSERVATION_CATEGORIES } from '@/lib/constants';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../../theme';
import TextInput from '@/components/ui/TextInput';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Toast from '@/components/ui/Toast';

interface Props {
  visible: boolean;
  onClose: () => void;
  preselectedChildId?: string | null;
}

export default function AddObservationSheet({ visible, onClose, preselectedChildId }: Props) {
  const { t } = useTranslation();
  const { profile } = useEducator();
  const { activeRole } = useRole();
  const { data: students = [] } = useStudents(profile, activeRole);
  const { mutateAsync: addObservation } = useAddObservation();

  const approved = students.filter((s) => s.approvalStatus === 'approved');

  const [selectedChildId, setSelectedChildId] = useState<string | null>(preselectedChildId ?? null);
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', visible: false });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!selectedChildId) e.child = t('errors.required_field');
    if (!note.trim()) e.note = t('errors.required_field');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate() || !profile || !activeRole) return;
    setSaving(true);
    try {
      await addObservation({
        educatorId: profile.id,
        roleInstanceId: activeRole.id,
        childId: selectedChildId!,
        note: note.trim(),
        category,
      });
      setToast({ message: t('observations.saved'), type: 'success', visible: true });
      setTimeout(handleClose, 1200);
    } catch {
      setToast({ message: t('errors.save_failed'), type: 'error', visible: true });
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setSelectedChildId(preselectedChildId ?? null);
    setNote('');
    setCategory(null);
    setErrors({});
    onClose();
  }

  const selectedChild = approved.find((s) => s.childId === selectedChildId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <Toast message={toast.message} type={toast.type} visible={toast.visible}
            onHide={() => setToast((p) => ({ ...p, visible: false }))} />
          <View style={styles.handle} />
          <Text style={styles.title}>{t('observations.add_title')}</Text>

          {/* Student picker */}
          <Text style={styles.label}>
            {t('observations.select_student')}
            <Text style={styles.required}> *</Text>
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.studentScroll} contentContainerStyle={styles.studentScrollContent}>
            {approved.map((s) => (
              <TouchableOpacity
                key={s.childId}
                style={[styles.studentChip, selectedChildId === s.childId && styles.studentChipSelected]}
                onPress={() => { setSelectedChildId(s.childId); setErrors((e) => ({ ...e, child: '' })); }}
              >
                <Text style={[styles.studentChipText, selectedChildId === s.childId && styles.studentChipTextSelected]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {errors.child && <Text style={styles.errorText}>{errors.child}</Text>}

          {/* Category chips */}
          <Text style={styles.label}>{t('observations.category_label')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll} contentContainerStyle={styles.studentScrollContent}>
            {OBSERVATION_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.studentChip, category === cat && styles.categoryChipSelected]}
                onPress={() => setCategory(category === cat ? null : cat)}
              >
                <Text style={[styles.studentChipText, category === cat && styles.categoryChipTextSelected]}>
                  {t(`observations.category.${cat}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Note */}
          <TextInput
            label={t('observations.note_label')}
            placeholder={t('observations.note_placeholder')}
            value={note}
            onChangeText={(v) => { setNote(v); setErrors((e) => ({ ...e, note: '' })); }}
            multiline
            numberOfLines={4}
            error={errors.note}
            required
            style={styles.noteInput}
          />

          <PrimaryButton
            label={saving ? t('observations.saving') : t('buttons.save')}
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
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    padding: Spacing[5],
    paddingBottom: Spacing[8],
    maxHeight: '90%',
    ...Shadows.sheet,
  },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing[4] },
  title: { fontSize: FontSize.xl, fontFamily: FontFamily.extraBold, color: Colors.ink, marginBottom: Spacing[4] },
  label: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.ink, marginBottom: Spacing[2] },
  required: { color: Colors.terra },
  studentScroll: { maxHeight: 48, marginBottom: Spacing[3] },
  categoryScroll: { maxHeight: 44, marginBottom: Spacing[3] },
  studentScrollContent: { gap: Spacing[2], paddingRight: Spacing[2] },
  studentChip: {
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[1] + 2,
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  studentChipSelected: { borderColor: Colors.forest, backgroundColor: Colors.leafPale },
  categoryChipSelected: { borderColor: Colors.amber, backgroundColor: Colors.amberPale },
  studentChipText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.inkMuted },
  studentChipTextSelected: { color: Colors.forest },
  categoryChipTextSelected: { color: '#7A5200' },
  noteInput: { height: 100, textAlignVertical: 'top', paddingTop: Spacing[2] },
  errorText: { fontSize: FontSize.xs, color: Colors.terra, marginTop: -Spacing[2], marginBottom: Spacing[2] },
});
