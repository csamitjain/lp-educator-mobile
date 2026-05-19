import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../../theme';
import PrimaryButton from '@/components/ui/PrimaryButton';

interface Props {
  visible: boolean;
  totalCount: number;
  onMarkAllPresent: () => void;
  onMarkAllAbsent: () => void;
  onClose: () => void;
}

export default function BulkMarkSheet({
  visible,
  totalCount,
  onMarkAllPresent,
  onMarkAllAbsent,
  onClose,
}: Props) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('attendance.bulk.title')}</Text>
          <Text style={styles.subtitle}>
            {t('attendance.summary.total', { count: totalCount })}
          </Text>

          <View style={styles.btnRow}>
            <PrimaryButton
              label={t('attendance.bulk.mark_all_present')}
              onPress={() => { onMarkAllPresent(); onClose(); }}
              style={styles.presentBtn}
            />
            <PrimaryButton
              label={t('attendance.bulk.mark_all_absent')}
              onPress={() => { onMarkAllAbsent(); onClose(); }}
              variant="secondary"
              style={styles.absentBtn}
            />
          </View>

          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>{t('buttons.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    padding: Spacing[5],
    paddingBottom: Spacing[8],
    ...Shadows.sheet,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing[4],
  },
  title: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.extraBold,
    color: Colors.ink,
    marginBottom: Spacing[1],
  },
  subtitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.inkMuted,
    marginBottom: Spacing[5],
  },
  btnRow: {
    gap: Spacing[3],
  },
  presentBtn: {
    backgroundColor: Colors.forest,
  },
  absentBtn: {},
  cancelBtn: {
    alignItems: 'center',
    marginTop: Spacing[3],
    padding: Spacing[2],
  },
  cancelText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.inkMuted,
  },
});
