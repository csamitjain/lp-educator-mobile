import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AttendanceColors } from '../../../theme';
import { cycleAttendanceStatus, ATTENDANCE_STATUSES } from '@/lib/constants';
import type { AttendanceStatus } from '@/types/database';

interface Props {
  status: AttendanceStatus | null;
  onPress: (next: AttendanceStatus) => void;
  disabled?: boolean;
}

export default function AttendanceStatusButton({ status, onPress, disabled }: Props) {
  const { t } = useTranslation();

  const current = status ?? 'present';
  const colors = AttendanceColors[current];

  function handlePress() {
    if (disabled) return;
    if (status === null) {
      onPress('present');
    } else {
      onPress(cycleAttendanceStatus(status));
    }
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.btn,
        { backgroundColor: colors.bg, borderColor: colors.dot },
        status === null && styles.btnUnmarked,
      ]}
      activeOpacity={0.75}
    >
      <Text style={[styles.dot, { color: colors.dot }]}>●</Text>
      <Text style={[styles.label, { color: colors.text }]}>
        {status === null
          ? '—'
          : t(`attendance_status.${status}`)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 4,
  },
  btnUnmarked: {
    backgroundColor: '#F5F5F5',
    borderColor: '#DDD',
  },
  dot: {
    fontSize: 8,
    lineHeight: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
