import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FontFamily, FontSize, Radius, Spacing, RoleColors } from '../../theme';
import { normalizeRole } from '@/types/database';
import type { EducatorRole } from '@/types/database';

interface Props {
  role: EducatorRole;
  size?: 'sm' | 'md';
}

export default function RoleBadge({ role, size = 'md' }: Props) {
  const { t } = useTranslation();
  const displayRole = normalizeRole(role);
  const colors = RoleColors[displayRole] ?? RoleColors.teacher;

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        { backgroundColor: colors.bg, borderColor: colors.border },
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'sm' && styles.textSm,
          { color: colors.text },
        ]}
      >
        {t(`roles.${displayRole}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing[3],
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
  },
  text: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
  },
  textSm: {
    fontSize: FontSize.xs,
  },
});
