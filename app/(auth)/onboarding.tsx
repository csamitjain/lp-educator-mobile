import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

import { supabase, getPublicAvatarUrl } from '@/lib/supabase';
import { useEducator } from '@/lib/educator-context';
import { ROLE_OPTIONS, SUBJECTS, GRADES, isValidLPCode } from '@/lib/constants';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../theme';
import StepHeader from '@/components/onboarding/StepHeader';
import RoleCard from '@/components/onboarding/RoleCard';
import ChipSelector from '@/components/onboarding/ChipSelector';
import TextInput from '@/components/ui/TextInput';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Toast from '@/components/ui/Toast';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import type { EducatorRole } from '@/types/database';

const TOTAL_STEPS = 3;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userId, setProfile } = useEducator();

  // ─── Step 1: Profile ───────────────────────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);

  // ─── Step 2: Roles ─────────────────────────────────────────────────────────
  const [selectedRoles, setSelectedRoles] = useState<EducatorRole[]>([]);

  // ─── Step 3: Institution ───────────────────────────────────────────────────
  const [isAffiliated, setIsAffiliated] = useState(true);
  const [schoolName, setSchoolName] = useState('');
  const [lpCode, setLpCode] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);

  // ─── UI State ──────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '', type: 'success', visible: false,
  });

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type, visible: true });
  }

  // ─── Avatar picker ─────────────────────────────────────────────────────────

  async function handlePickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setAvatarUri(asset.uri);

    // Upload to profile-avatars bucket
    try {
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `${userId}/${Date.now()}.${ext}`;
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error } = await supabase.storage
        .from('profile-avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

      if (!error) setAvatarPath(path);
    } catch {
      // Non-critical — avatar upload failure shouldn't block onboarding
    }
  }

  // ─── Toggle role ───────────────────────────────────────────────────────────

  function toggleRole(role: EducatorRole) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  // ─── Toggle chip ───────────────────────────────────────────────────────────

  function toggleSubject(s: string) {
    setSelectedSubjects((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);
  }

  function toggleGrade(g: string) {
    setSelectedGrades((p) => p.includes(g) ? p.filter((x) => x !== g) : [...p, g]);
  }

  // ─── Step validation ───────────────────────────────────────────────────────

  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = t('errors.required_field');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    if (selectedRoles.length === 0) {
      showToast(t('auth.onboarding.select_at_least_one_role'), 'error');
      return false;
    }
    return true;
  }

  function validateStep3(): boolean {
    const e: Record<string, string> = {};
    if (isAffiliated && !schoolName.trim()) {
      e.schoolName = t('errors.required_field');
    }
    if (lpCode && !isValidLPCode(lpCode)) {
      e.lpCode = t('errors.invalid_lp_code');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  function handleNext() {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep < TOTAL_STEPS) setCurrentStep((s) => s + 1);
  }

  function handleBack() {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!validateStep3()) return;
    if (!userId) return;

    setLoading(true);
    try {
      // 1. Insert educator_profiles
      const avatarUrl = avatarPath ? getPublicAvatarUrl(avatarPath) : null;

      const { data: profileData, error: profileError } = await supabase
        .from('educator_profiles')
        .insert({
          user_id: userId,
          full_name: fullName.trim(),
          city: city.trim() || null,
          avatar_url: avatarUrl,
          school_name: isAffiliated ? schoolName.trim() : null,
          educator_roles: selectedRoles,
          is_verified: false,
        })
        .select()
        .single();

      if (profileError) throw new Error(profileError.message);

      // 2. Insert educator_role_instances (first role = primary)
      const roleInserts = selectedRoles.map((role, index) => ({
        educator_id: profileData.id,
        role,
        institution_name: isAffiliated ? schoolName.trim() : null,
        institution_id_code: lpCode.trim() || null,
        subjects: selectedSubjects,
        grades: selectedGrades,
        is_primary: index === 0,
        is_active: true,
      }));

      const { error: rolesError } = await supabase
        .from('educator_role_instances')
        .insert(roleInserts);

      if (rolesError) throw new Error(rolesError.message);

      // 3. Update profiles.user_type = 'educator'
      await supabase
        .from('profiles')
        .update({ user_type: 'educator' })
        .eq('id', userId);

      // 4. Update context — triggers AuthGate to redirect to dashboard
      setProfile(profileData);
      showToast(t('auth.onboarding.success'), 'success');

    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.save_failed');
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  // ─── Step titles ───────────────────────────────────────────────────────────

  const stepTitles = [
    { title: t('auth.onboarding.step1_title'), subtitle: t('auth.onboarding.step1_subtitle') },
    { title: t('auth.onboarding.step2_title'), subtitle: t('auth.onboarding.step2_subtitle') },
    { title: t('auth.onboarding.step3_title'), subtitle: t('auth.onboarding.step3_subtitle') },
  ];

  const { title, subtitle } = stepTitles[currentStep - 1];

  return (
    <View style={styles.flex}>
      <LoadingOverlay visible={loading} message={t('auth.onboarding.submitting')} />
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast((p) => ({ ...p, visible: false }))}
      />

      <StepHeader
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        title={title}
        subtitle={subtitle}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Step 1: Profile ─────────────────────────────────────────── */}
        {currentStep === 1 && (
          <View>
            {/* Avatar */}
            <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarContainer}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>📷</Text>
                </View>
              )}
              <Text style={styles.avatarHint}>{t('auth.onboarding.avatar_hint')}</Text>
            </TouchableOpacity>

            <TextInput
              label={t('auth.onboarding.full_name_label')}
              placeholder={t('auth.onboarding.full_name_placeholder')}
              value={fullName}
              onChangeText={(v) => { setFullName(v); setErrors((e) => ({ ...e, fullName: '' })); }}
              error={errors.fullName}
              required
              autoCapitalize="words"
            />

            <TextInput
              label={t('auth.onboarding.city_label')}
              placeholder={t('auth.onboarding.city_placeholder')}
              value={city}
              onChangeText={setCity}
              autoCapitalize="words"
            />
          </View>
        )}

        {/* ─── Step 2: Roles ───────────────────────────────────────────── */}
        {currentStep === 2 && (
          <View style={styles.rolesGrid}>
            {ROLE_OPTIONS.map((opt) => (
              <RoleCard
                key={opt.role}
                role={opt.role}
                emoji={opt.emoji}
                selected={selectedRoles.includes(opt.role)}
                onPress={() => toggleRole(opt.role)}
              />
            ))}
          </View>
        )}

        {/* ─── Step 3: Institution ─────────────────────────────────────── */}
        {currentStep === 3 && (
          <View>
            {/* Affiliation toggle */}
            <View style={styles.affiliationCard}>
              <View style={styles.affiliationRow}>
                <Text style={styles.affiliationLabel}>
                  {isAffiliated
                    ? t('auth.onboarding.affiliated_school')
                    : t('auth.onboarding.independent')}
                </Text>
                <Switch
                  value={isAffiliated}
                  onValueChange={setIsAffiliated}
                  trackColor={{ false: Colors.border, true: Colors.leaf }}
                  thumbColor={Colors.white}
                />
              </View>
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
                  autoCapitalize="words"
                />

                <TextInput
                  label={t('auth.onboarding.lp_code_label')}
                  placeholder={t('auth.onboarding.lp_code_placeholder')}
                  value={lpCode}
                  onChangeText={(v) => { setLpCode(v.toUpperCase()); setErrors((e) => ({ ...e, lpCode: '' })); }}
                  error={errors.lpCode}
                  hint={t('auth.onboarding.lp_code_hint')}
                  autoCapitalize="characters"
                />
              </>
            )}

            <ChipSelector
              label={t('auth.onboarding.subjects_label')}
              options={SUBJECTS}
              selected={selectedSubjects}
              onToggle={toggleSubject}
            />

            <ChipSelector
              label={t('auth.onboarding.grades_label')}
              options={GRADES}
              selected={selectedGrades}
              onToggle={toggleGrade}
            />
          </View>
        )}

        {/* ─── Navigation buttons ───────────────────────────────────────── */}
        <View style={styles.navRow}>
          {currentStep > 1 && (
            <PrimaryButton
              label={t('buttons.back')}
              variant="ghost"
              onPress={handleBack}
              style={styles.backBtn}
            />
          )}
          <PrimaryButton
            label={
              currentStep === TOTAL_STEPS
                ? (loading ? t('auth.onboarding.submitting') : t('buttons.submit'))
                : t('buttons.next')
            }
            loading={loading && currentStep === TOTAL_STEPS}
            onPress={currentStep === TOTAL_STEPS ? handleSubmit : handleNext}
            style={styles.nextBtn}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flex: 1 },
  content: {
    padding: Spacing[5],
    paddingBottom: Spacing[10],
  },

  // Avatar
  avatarContainer: {
    alignItems: 'center',
    marginBottom: Spacing[5],
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: Spacing[2],
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.leafPale,
    borderWidth: 2,
    borderColor: Colors.leaf,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  avatarPlaceholderText: {
    fontSize: 32,
  },
  avatarHint: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.inkFaint,
  },

  // Roles grid
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing[2],
  },

  // Institution
  affiliationCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing[4],
    marginBottom: Spacing[4],
    ...Shadows.soft,
  },
  affiliationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  affiliationLabel: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.ink,
    flex: 1,
    marginRight: Spacing[3],
  },

  // Nav buttons
  navRow: {
    flexDirection: 'row',
    marginTop: Spacing[6],
    gap: Spacing[3],
  },
  backBtn: {
    flex: 1,
  },
  nextBtn: {
    flex: 2,
  },
});
