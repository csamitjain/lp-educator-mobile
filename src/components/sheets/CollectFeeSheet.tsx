import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useEducator } from '@/lib/educator-context';
import { useCollectFee } from '@/hooks/useFee';
import { FEE_METHODS, currentYearMonth, formatYearMonth } from '@/lib/constants';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../../theme';
import TextInput from '@/components/ui/TextInput';
import PrimaryButton from '@/components/ui/PrimaryButton';
import StudentAvatar from '@/components/StudentAvatar';
import Toast from '@/components/ui/Toast';
import type { EnrichedFeeStatus } from '@/hooks/useFee';

interface Props {
  visible: boolean;
  feeStatus: EnrichedFeeStatus | null;
  onClose: () => void;
}

export default function CollectFeeSheet({ visible, feeStatus, onClose }: Props) {
  const { t } = useTranslation();
  const { profile } = useEducator();
  const { mutateAsync: collectFee } = useCollectFee();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', visible: false });

  useEffect(() => {
    if (feeStatus) {
      setAmount(String(feeStatus.planAmount));
      setMethod(null);
      setNote('');
      setErrors({});
    }
  }, [feeStatus, visible]);

  function validate() {
    const e: Record<string, string> = {};
    const num = Number(amount);
    if (!amount || isNaN(num) || num <= 0) e.amount = t('errors.required_field');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCollect() {
    if (!validate() || !feeStatus || !profile) return;
    setSaving(true);
    try {
      await collectFee({
        educatorId: profile.id,
        childId: feeStatus.childId,
        planId: feeStatus.planId,
        amount: Number(amount),
        forMonth: feeStatus.forMonth,
        method,
        note: note.trim() || null,
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
    setAmount(''); setMethod(null); setNote(''); setErrors({});
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
          <Text style={styles.title}>{t('fee.collect_fee')}</Text>

          {/* Student info */}
          {feeStatus && (
            <View style={styles.studentRow}>
              <StudentAvatar name={feeStatus.childName} avatarUrl={feeStatus.childAvatarUrl} size="md" />
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{feeStatus.childName}</Text>
                <Text style={styles.forMonth}>
                  {t('fee.for_month_label')}: {formatYearMonth(feeStatus.forMonth)}
                </Text>
              </View>
              <View style={styles.planBadge}>
                <Text style={styles.planAmount}>₹{feeStatus.planAmount}</Text>
                <Text style={styles.planCycle}>
                  {t(`fee.cycle_${feeStatus.planCycle}` as any)}
                </Text>
              </View>
            </View>
          )}

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

          {/* Payment method */}
          <Text style={styles.label}>{t('fee.method_label')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.methodScroll} contentContainerStyle={styles.methodRow}>
            {FEE_METHODS.map((m) => (
              <TouchableOpacity key={m}
                style={[styles.methodChip, method === m && styles.methodChipSelected]}
                onPress={() => setMethod(method === m ? null : m)}>
                <Text style={[styles.methodChipText, method === m && styles.methodChipTextSelected]}>
                  {t(`fee.method.${m}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Note */}
          <TextInput
            label={t('fee.note_label')}
            value={note}
            onChangeText={setNote}
            placeholder="Optional note..."
            multiline
            numberOfLines={2}
            style={{ height: 64, textAlignVertical: 'top' }}
          />

          <PrimaryButton
            label={saving ? t('common.loading') : t('buttons.collect')}
            loading={saving}
            onPress={handleCollect}
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
    paddingBottom: Spacing[8], ...Shadows.sheet,
  },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing[4] },
  title: { fontSize: FontSize.xl, fontFamily: FontFamily.extraBold, color: Colors.ink, marginBottom: Spacing[4] },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], backgroundColor: Colors.creamDark, borderRadius: Radius.card, padding: Spacing[3], marginBottom: Spacing[4] },
  studentInfo: { flex: 1 },
  studentName: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.ink },
  forMonth: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.inkMuted, marginTop: 2 },
  planBadge: { alignItems: 'flex-end' },
  planAmount: { fontSize: FontSize.lg, fontFamily: FontFamily.extraBold, color: Colors.forest },
  planCycle: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.inkMuted },
  label: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.ink, marginBottom: Spacing[2] },
  methodScroll: { maxHeight: 44, marginBottom: Spacing[3] },
  methodRow: { gap: Spacing[2], paddingRight: Spacing[2] },
  methodChip: { paddingHorizontal: Spacing[3], paddingVertical: Spacing[1] + 2, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  methodChipSelected: { borderColor: Colors.amber, backgroundColor: Colors.amberPale },
  methodChipText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.inkMuted },
  methodChipTextSelected: { color: '#7A5200' },
});
