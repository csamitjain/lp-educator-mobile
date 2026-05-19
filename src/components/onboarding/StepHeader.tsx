import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Colors, FontFamily, FontSize, Gradients, Spacing } from '../../../theme';
import { changeLanguage, getCurrentLang } from '@/lib/i18n';
import type { SupportedLanguage } from '@/lib/constants';

interface Props {
  currentStep: number;
  totalSteps: number;
  title: string;
  subtitle: string;
}

export default function StepHeader({ currentStep, totalSteps, title, subtitle }: Props) {
  const { t } = useTranslation();
  const currentLang = getCurrentLang();

  const handleToggleLang = async () => {
    const next: SupportedLanguage = currentLang === 'hi' ? 'en' : 'hi';
    await changeLanguage(next);
  };

  return (
    <LinearGradient
      colors={Gradients.header.colors}
      start={Gradients.header.start}
      end={Gradients.header.end}
      locations={Gradients.header.locations}
      style={styles.container}
    >
      {/* Top row: step counter + language toggle */}
      <View style={styles.topRow}>
        <Text style={styles.stepCounter}>
          {t('auth.onboarding.step_of', {
            current: currentStep,
            total: totalSteps,
          })}
        </Text>
        <TouchableOpacity onPress={handleToggleLang} style={styles.langToggle}>
          <Text style={styles.langToggleText}>
            {currentLang === 'hi' ? 'EN' : 'हिं'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${(currentStep / totalSteps) * 100}%` },
          ]}
        />
      </View>

      {/* Title + subtitle */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 56,
    paddingBottom: Spacing[6],
    paddingHorizontal: Spacing[5],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  stepCounter: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    color: 'rgba(255,255,255,0.7)',
  },
  langToggle: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  langToggleText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginBottom: Spacing[4],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.leaf,
    borderRadius: 2,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.extraBold,
    color: Colors.white,
    marginBottom: Spacing[1],
  },
  subtitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.75)',
  },
});
