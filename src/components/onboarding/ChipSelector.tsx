import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../../theme';

interface Props {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  required?: boolean;
}

export default function ChipSelector({
  label,
  options,
  selected,
  onToggle,
  required,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <View style={styles.chipGrid}>
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <TouchableOpacity
              key={option}
              onPress={() => onToggle(option)}
              style={[styles.chip, isSelected && styles.chipSelected]}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing[4],
  },
  label: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.ink,
    marginBottom: Spacing[2],
  },
  required: {
    color: Colors.terra,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  chip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1] + 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipSelected: {
    borderColor: Colors.forest,
    backgroundColor: Colors.leafPale,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.inkMuted,
  },
  chipTextSelected: {
    fontFamily: FontFamily.semiBold,
    color: Colors.forest,
  },
});
