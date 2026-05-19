import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Colors, FontFamily, FontSize, Gradients, Spacing, RoleColors } from '../../theme';
import { changeLanguage, getCurrentLang } from '@/lib/i18n';
import { normalizeRole } from '@/types/database';
import type { SupportedLanguage } from '@/lib/constants';
import type { EducatorRole } from '@/types/database';

interface Props {
  title?: string;
  subtitle?: string;
  role?: EducatorRole | null;
  showLangToggle?: boolean;
  rightElement?: React.ReactNode;
}

export default function AppHeader({
  title,
  subtitle,
  role,
  showLangToggle = true,
  rightElement,
}: Props) {
  const { t } = useTranslation();
  const currentLang = getCurrentLang();

  async function handleToggleLang() {
    const next: SupportedLanguage = currentLang === 'hi' ? 'en' : 'hi';
    await changeLanguage(next);
  }

  const displayRole = role ? normalizeRole(role) : null;
  const roleColor = displayRole ? RoleColors[displayRole] : null;

  return (
    <LinearGradient
      colors={Gradients.header.colors}
      start={Gradients.header.start}
      end={Gradients.header.end}
      locations={Gradients.header.locations}
      style={styles.container}
    >
      <View style={styles.row}>
        {/* Left: title + role badge */}
        <View style={styles.left}>
          {title && (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
          {displayRole && roleColor && (
            <View style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={styles.roleBadgeText}>
                {t(`roles.${displayRole}`)}
              </Text>
            </View>
          )}
        </View>

        {/* Right: lang toggle + optional custom element */}
        <View style={styles.right}>
          {rightElement}
          {showLangToggle && (
            <TouchableOpacity onPress={handleToggleLang} style={styles.langToggle}>
              <Text style={styles.langToggleText}>
                {currentLang === 'hi' ? 'EN' : 'हिं'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 52,
    paddingBottom: Spacing[4],
    paddingHorizontal: Spacing[5],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  left: {
    flex: 1,
    marginRight: Spacing[3],
  },
  title: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.extraBold,
    color: Colors.white,
  },
  subtitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  roleBadgeText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginTop: 4,
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
});
