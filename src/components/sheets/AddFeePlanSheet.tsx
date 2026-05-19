import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useEducator } from '@/lib/educator-context';
import { useRole } from '@/lib/role-context';
import { useStudents } from '@/hooks/useStudents';
import { useCreateFeePlan } from '@/hooks/useFee';
import { currentYearMonth } from '@/lib/fee-utils';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../../theme';
import TextInput from '@/components/ui/TextInput';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Toast from '@/components/ui/Toast';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Cycle = 'monthly' | 'quarterly';

export default function AddFeePlanSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { profile } = useEducator();
  const { activeRole } = useRole();
  const { data: students = [] } = useStudents(profile, activeRole);
  const { mutateAsync: createPlan } = useCreateFeePlan();

  const approved = students.filter((s) => s.approvalStatus === 'approved');

  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [startMonth, setStartMonth] = useState(currentYearMonth());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', visible: false });

  function validate() {
    const e: Record<string, string> = {};
    if (!selectedChildId) e.child = t('errors.required_field');
    const num = Number(amount);
    if (!amount || isNaN(num) || num <= 0) e.amount = t('errors.required_field');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate() || !profile || !activeRole) return;
    setSaving(true);
    try {
      await createPlan({
        educatorId: profile.id,
        roleInstanceId: activeRole.id,
        childId: selectedChildId!,
        amount: Number(amount),
        cycle,
        startMonth,
      });
      setToast({ message: t('fee.collected'), type: 'success', visible: true });
      setTimeout(handleClose, 1200);
    } catch {
      setToast({ message: t('errors.save_failed'), type: 'error', visible: true });
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setSelectedChildId(null);
    setAmount('');
    setCycle('monthly');
    setStartMonth(currentYearMonth());
    setErrors({});
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <Toast message={toast.message} type={toast.type} visible={toast.visible}
            onHide={() => setToast((p) => ({ ...p, visible: false }))} />
          <View style={styles.handle} />
          <Text style={styles.title}>{t('fee.add_plan')}</Text>

          {/* Student picker */}
          <Text style={styles.label}>
            {t('observations.select_student')}
            <Text style={styles.required}> *</Text>
          </Text>
          <View style={styles.studentGrid}>
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
          </View>
          {errors.child && <Text style={styles.errorText}>{errors.child}</Text>}

          {/* Amount */}
          <TextInput
            label={t('fee.amount_label')}
            value={amount}
            onChangeText={(v) => { setAmount(v.replace(/[^0-9]/g, '')); setErrors((e) => ({ ...e, amount: '' })); }}
            keyboardType="numeric"
            error={errors.amount}
            required
            prefix="₹"
          />

          {/* Cycle */}
          <Text style={styles.label}>{t('fee.cycle_label')}</Text>
          <View style={styles.cycleRow}>
            {(['monthly', 'quarterly'] as Cycle[]).map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.cycleChip, cycle === c && styles.cycleChipSelected]}
                onPress={() => setCycle(c)}
              >
                <Text style={[styles.cycleText, cycle === c && styles.cycleTextSelected]}>
                  {t(`fee.cycle_${c}` as any)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Start month */}
          <TextInput
            label={t('fee.start_month_label')}
            value={startMonth}
            onChangeText={setStartMonth}
            placeholder="YYYY-MM"
            hint="Format: 2025-06"
          />

          <PrimaryButton
            label={saving ? t('common.loading') : t('buttons.save')}
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
  required: { color: Colors.terra },
  studentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2], marginBottom: Spacing[3] },
  studentChip: { paddingHorizontal: Spacing[3], paddingVertical: Spacing[1] + 2, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  studentChipSelected: { borderColor: Colors.forest, backgroundColor: Colors.leafPale },
  studentChipText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.inkMuted },
  studentChipTextSelected: { color: Colors.forest },
  errorText: { fontSize: FontSize.xs, color: Colors.terra, marginTop: -Spacing[2], marginBottom: Spacing[2] },
  cycleRow: { flexDirection: 'row', gap: Spacing[3], marginBottom: Spacing[3] },
  cycleChip: { flex: 1, alignItems: 'center', paddingVertical: Spacing[2], borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border },
  cycleChipSelected: { borderColor: Colors.amber, backgroundColor: Colors.amberPale },
  cycleText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.inkMuted },
  cycleTextSelected: { color: '#7A5200' },
});
