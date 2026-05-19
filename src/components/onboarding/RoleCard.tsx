import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows, RoleColors } from '../../../theme';
import type { EducatorRole } from '@/types/database';
import { normalizeRole } from '@/types/database';

interface Props {
  role: EducatorRole;
  emoji: string;
  selected: boolean;
  onPress: () => void;
}

export default function RoleCard({ role, emoji, selected, onPress }: Props) {
  const { t } = useTranslation();
  const displayRole = normalizeRole(role);
  const roleColor = RoleColors[displayRole] ?? RoleColors.teacher;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.card,
        selected && {
          borderColor: roleColor.border,
          backgroundColor: roleColor.bg,
        },
        !selected && styles.cardUnselected,
      ]}
    >
      {/* Selected indicator */}
      <View style={[styles.checkCircle, selected && styles.checkCircleSelected]}>
        {selected && <Text style={styles.checkMark}>✓</Text>}
      </View>

      <Text style={styles.emoji}>{emoji}</Text>
      <Text
        style={[
          styles.roleLabel,
          selected && { color: roleColor.text },
        ]}
      >
        {t(`roles.${role === 'subject_teacher' ? 'teacher' : role}`)}
      </Text>
      <Text
        style={[
          styles.roleDesc,
          selected && { color: roleColor.text },
        ]}
        numberOfLines={2}
      >
        {t(`roles.${role === 'subject_teacher' ? 'teacher' : role}_desc`)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    maxWidth: '48%',
    borderRadius: Radius.card,
    borderWidth: 2,
    padding: Spacing[4],
    alignItems: 'center',
    marginBottom: Spacing[3],
    ...Shadows.soft,
  },
  cardUnselected: {
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  checkCircle: {
    position: 'absolute',
    top: Spacing[2],
    right: Spacing[2],
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  checkCircleSelected: {
    backgroundColor: Colors.forest,
    borderColor: Colors.forest,
  },
  checkMark: {
    color: Colors.white,
    fontSize: 11,
    fontFamily: FontFamily.bold,
  },
  emoji: {
    fontSize: 32,
    marginBottom: Spacing[2],
    marginTop: Spacing[1],
  },
  roleLabel: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: Spacing[1],
  },
  roleDesc: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: Colors.inkMuted,
    textAlign: 'center',
  },
});
