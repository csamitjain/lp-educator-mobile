import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEducator } from '@/lib/educator-context';
import { ROLE_OPTIONS, SUBJECTS, GRADES, QueryKeys } from '@/lib/constants';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../../theme';
import TextInput from '@/components/ui/TextInput';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Toast from '@/components/ui/Toast';
import type { EducatorRole } from '@/types/database';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AddRoleSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useEducator();

  const [selectedRole, setSelectedRole] = useState<EducatorRole | null>(null);
  const [isAffiliated, setIsAffiliated] = useState(true);
  const [schoolName, setSchoolName] = useState('');
  const [lpCode, setLpCode] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', visible: false });

  function toggleSubject(s: string) {
    setSelectedSubjects((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);
  }
  function toggleGrade(g: string) {
    setSelectedGrades((p) => p.includes(g) ? p.filter((x) => x !== g) : [...p, g]);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!selectedRole) e.role = t('errors.required_field');
    if (isAffiliated && !schoolName.trim()) e.schoolName = t('errors.required_field');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate() || !profile) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('educator_role_instances').insert({
        educator_id: profile.id,
        role: selectedRole!,
        institution_name: isAffiliated ? schoolName.trim() : null,
        institution_id_code: lpCode.trim() || null,
        subjects: selectedSubjects,
        grades: selectedGrades,
        is_primary: false,
        is_active: true,
      });
      if (error) throw new Error(error.message);

      queryClient.invalidateQueries({
        queryKey: QueryKeys.roleInstances(profile.id),
      });
      setToast({ message: t('buttons.save'), type: 'success', visible: true });
      setTimeout(handleClose, 1000);
    } catch {
      setToast({ message: t('errors.save_failed'), type: 'error', visible: true });
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setSelectedRole(null);
    setIsAffiliated(true);
    setSchoolName('');
    setLpCode('');
    setSelectedSubjects([]);
    setSelectedGrades([]);
    setErrors({});
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
        <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>
          <Toast message={toast.message} type={toast.type} visible={toast.visible}
            onHide={() => setToast((p) => ({ ...p, visible: false }))} />
          <View style={styles.handle} />
          <Text style={styles.title}>{t('profile.add_role')}</Text>

          {/* Role selector */}
          <Text style={styles.label}>
            {t('profile.roles_section')}
            <Text style={styles.required}> *</Text>
          </Text>
          {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
          <View style={styles.rolesGrid}>
            {ROLE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.role}
                style={[styles.roleCard, selectedRole === opt.role && styles.roleCardSelected]}
                onPress={() => { setSelectedRole(opt.role); setErrors((e) => ({ ...e, role: '' })); }}
              >
                <Text style={styles.roleEmoji}>{opt.emoji}</Text>
                <Text style={[styles.roleLabel, selectedRole === opt.role && styles.roleLabelSelected]}>
                  {t(`roles.${opt.role === 'subject_teacher' ? 'teacher' : opt.role}`)}
                </Text>
                {selectedRole === opt.role && (
                  <View style={styles.roleCheck}><Text style={styles.roleCheckText}>✓</Text></View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Affiliation */}
          <View style={styles.affiliationCard}>
            <Text style={styles.affiliationLabel}>
              {isAffiliated ? t('auth.onboarding.affiliated_school') : t('auth.onboarding.independent')}
            </Text>
            <Switch
              value={isAffiliated}
              onValueChange={setIsAffiliated}
              trackColor={{ false: Colors.border, true: Colors.leaf }}
              thumbColor={Colors.white}
            />
          </View>

          {isAffiliated && (
            <>
              <TextInput
                label={t('auth.onboarding.school_name_label')}
                placeholder={t('auth.onboarding.school_name_placeholder')}
                value={schoolName}
                onChangeText={(v) => { setSchoolName(v); setErrors((e) => ({ ...e, schoolName: '' })); }}
                error={errors.schoolName}
                required
              />
              <TextInput
                label={t('auth.onboarding.lp_code_label')}
                placeholder={t('auth.onboarding.lp_code_placeholder')}
                value={lpCode}
                onChangeText={(v) => setLpCode(v.toUpperCase())}
                hint={t('auth.onboarding.lp_code_hint')}
              />
            </>
          )}

          {/* Subjects */}
          <Text style={styles.label}>{t('auth.onboarding.subjects_label')}</Text>
          <View style={styles.chipGrid}>
            {SUBJECTS.map((s) => (
              <TouchableOpacity key={s}
                style={[styles.chip, selectedSubjects.includes(s) && styles.chipSelected]}
                onPress={() => toggleSubject(s)}>
                <Text style={[styles.chipText, selectedSubjects.includes(s) && styles.chipTextSelected]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Grades */}
          <Text style={styles.label}>{t('auth.onboarding.grades_label')}</Text>
          <View style={styles.chipGrid}>
            {GRADES.map((g) => (
              <TouchableOpacity key={g}
                style={[styles.chip, selectedGrades.includes(g) && styles.chipSelected]}
                onPress={() => toggleGrade(g)}>
                <Text style={[styles.chipText, selectedGrades.includes(g) && styles.chipTextSelected]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <PrimaryButton
            label={saving ? t('common.loading') : t('buttons.save')}
            loading={saving}
            onPress={handleSave}
            style={styles.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: Radius.sheet, borderTopRightRadius: Radius.sheet, maxHeight: '92%' },
  sheetContent: { padding: Spacing[5], paddingBottom: Spacing[10] },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing[4] },
  title: { fontSize: FontSize.xl, fontFamily: FontFamily.extraBold, color: Colors.ink, marginBottom: Spacing[4] },
  label: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.ink, marginBottom: Spacing[2] },
  required: { color: Colors.terra },
  errorText: { fontSize: FontSize.xs, color: Colors.terra, marginBottom: Spacing[2] },
  rolesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2], marginBottom: Spacing[4] },
  roleCard: { width: '47%', borderRadius: Radius.card, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.white, padding: Spacing[3], alignItems: 'center', position: 'relative' },
  roleCardSelected: { borderColor: Colors.forest, backgroundColor: Colors.leafPale },
  roleEmoji: { fontSize: 24, marginBottom: Spacing[1] },
  roleLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.inkMuted, textAlign: 'center' },
  roleLabelSelected: { color: Colors.forest },
  roleCheck: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.forest, alignItems: 'center', justifyContent: 'center' },
  roleCheckText: { color: Colors.white, fontSize: 11, fontFamily: FontFamily.bold },
  affiliationCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.creamDark, borderRadius: Radius.card, padding: Spacing[3], marginBottom: Spacing[4] },
  affiliationLabel: { fontSize: FontSize.base, fontFamily: FontFamily.semiBold, color: Colors.ink, flex: 1, marginRight: Spacing[3] },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2], marginBottom: Spacing[4] },
  chip: { paddingHorizontal: Spacing[3], paddingVertical: Spacing[1] + 2, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  chipSelected: { borderColor: Colors.forest, backgroundColor: Colors.leafPale },
  chipText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.inkMuted },
  chipTextSelected: { color: Colors.forest },
  saveBtn: { marginTop: Spacing[4] },
});
