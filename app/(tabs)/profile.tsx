import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';

import { supabase, getPublicAvatarUrl } from '@/lib/supabase';
import { useEducator } from '@/lib/educator-context';
import { useRole } from '@/lib/role-context';
import { changeLanguage, getCurrentLang } from '@/lib/i18n';
import { QueryKeys } from '@/lib/constants';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows, Gradients } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import TextInput from '@/components/ui/TextInput';
import PrimaryButton from '@/components/ui/PrimaryButton';
import RoleBadge from '@/components/RoleBadge';
import AddRoleSheet from '@/components/sheets/AddRoleSheet';
import Toast from '@/components/ui/Toast';
import type { SupportedLanguage } from '@/lib/constants';
import Constants from 'expo-constants';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, userId, setProfile } = useEducator();
  const { roleInstances } = useRole();
  const currentLang = getCurrentLang();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [saving, setSaving] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', visible: false });

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type, visible: true });
  }

  // ─── Avatar ───────────────────────────────────────────────────────────────

  async function handlePickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0] || !profile || !userId) return;

    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `${userId}/${Date.now()}.${ext}`;
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const avatarUrl = getPublicAvatarUrl(path);
      const { error: updateError } = await supabase
        .from('educator_profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: avatarUrl });
      showToast(t('profile.saved'));
    } catch {
      showToast(t('errors.upload_failed'), 'error');
    }
  }

  // ─── Save profile ─────────────────────────────────────────────────────────

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('educator_profiles')
        .update({ full_name: fullName.trim(), city: city.trim() || null })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({ ...profile, full_name: fullName.trim(), city: city.trim() || null });
      queryClient.invalidateQueries({ queryKey: QueryKeys.educatorProfile(userId ?? '') });
      setEditing(false);
      showToast(t('profile.saved'));
    } catch {
      showToast(t('errors.save_failed'), 'error');
    } finally {
      setSaving(false);
    }
  }

  // ─── Language toggle ──────────────────────────────────────────────────────

  async function handleLanguageToggle() {
    const next: SupportedLanguage = currentLang === 'hi' ? 'en' : 'hi';
    await changeLanguage(next);
  }

  // ─── Sign out ─────────────────────────────────────────────────────────────

  function handleSignOut() {
    Alert.alert(
      t('profile.sign_out'),
      t('profile.sign_out_confirm'),
      [
        { text: t('buttons.cancel'), style: 'cancel' },
        {
          text: t('profile.sign_out'),
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            queryClient.clear();
          },
        },
      ]
    );
  }

  const avatarUrl = profile?.avatar_url ?? null;

  return (
    <View style={styles.flex}>
      <Toast message={toast.message} type={toast.type} visible={toast.visible}
        onHide={() => setToast((p) => ({ ...p, visible: false }))} />

      {/* Gradient header */}
      <LinearGradient
        colors={Gradients.header.colors}
        start={Gradients.header.start}
        end={Gradients.header.end}
        locations={Gradients.header.locations}
        style={styles.header}
      >
        {/* Avatar */}
        <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarWrapper}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>
                {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <Text style={styles.avatarEditText}>📷</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.headerName}>{profile?.full_name ?? ''}</Text>
        {profile?.city && <Text style={styles.headerCity}>{profile.city}</Text>}
        {profile?.is_verified ? (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ {t('status.verified')}</Text>
          </View>
        ) : (
          <View style={styles.unverifiedBadge}>
            <Text style={styles.unverifiedText}>{t('status.unverified')}</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ─── Edit profile ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('profile.edit')}</Text>
            {!editing && (
              <TouchableOpacity onPress={() => { setEditing(true); setFullName(profile?.full_name ?? ''); setCity(profile?.city ?? ''); }}>
                <Text style={styles.editLink}>✏️ {t('buttons.edit')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {editing ? (
            <View style={styles.card}>
              <TextInput
                label={t('profile.full_name_label')}
                value={fullName}
                onChangeText={setFullName}
                required
              />
              <TextInput
                label={t('profile.city_label')}
                value={city}
                onChangeText={setCity}
              />
              <View style={styles.editBtnRow}>
                <PrimaryButton
                  label={t('buttons.cancel')}
                  variant="ghost"
                  onPress={() => setEditing(false)}
                  style={styles.cancelBtn}
                />
                <PrimaryButton
                  label={saving ? t('profile.saving') : t('buttons.save')}
                  loading={saving}
                  onPress={handleSave}
                  style={styles.saveBtn}
                />
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <InfoRow label={t('profile.full_name_label')} value={profile?.full_name ?? '—'} />
              <InfoRow label={t('profile.city_label')} value={profile?.city ?? '—'} />
            </View>
          )}
        </View>

        {/* ─── Language ──────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.language_section')}</Text>
          <View style={styles.card}>
            <View style={styles.langRow}>
              <View>
                <Text style={styles.langLabel}>
                  {currentLang === 'hi' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
                </Text>
                <Text style={styles.langSubLabel}>
                  {currentLang === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
                </Text>
              </View>
              <Switch
                value={currentLang === 'en'}
                onValueChange={handleLanguageToggle}
                trackColor={{ false: Colors.border, true: Colors.leaf }}
                thumbColor={Colors.white}
              />
            </View>
          </View>
        </View>

        {/* ─── Roles ─────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('profile.roles_section')}</Text>
            <TouchableOpacity onPress={() => setShowAddRole(true)}>
              <Text style={styles.editLink}>+ {t('profile.add_role')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {roleInstances.map((instance, index) => (
              <View key={instance.id}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.roleRow}>
                  <View style={styles.roleLeft}>
                    <RoleBadge role={instance.role} />
                    {instance.institution_name && (
                      <Text style={styles.institutionName}>{instance.institution_name}</Text>
                    )}
                    {instance.subjects?.length > 0 && (
                      <Text style={styles.roleDetail} numberOfLines={1}>
                        {instance.subjects.slice(0, 3).join(', ')}
                        {instance.subjects.length > 3 ? ` +${instance.subjects.length - 3}` : ''}
                      </Text>
                    )}
                  </View>
                  {instance.is_primary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Primary</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ─── Sign out ──────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>🚪 {t('profile.sign_out')}</Text>
        </TouchableOpacity>

        {/* App version */}
        <Text style={styles.version}>
          {t('profile.app_version', { version: appVersion })}
        </Text>

      </ScrollView>

      <AddRoleSheet visible={showAddRole} onClose={() => setShowAddRole(false)} />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.cream },

  header: {
    paddingTop: 52, paddingBottom: Spacing[6],
    paddingHorizontal: Spacing[5], alignItems: 'center',
  },
  avatarWrapper: { position: 'relative', marginBottom: Spacing[3] },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarFallback: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarFallbackText: { fontSize: FontSize['3xl'], fontFamily: FontFamily.extraBold, color: Colors.white },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.forest,
  },
  avatarEditText: { fontSize: 14 },
  headerName: { fontSize: FontSize.xl, fontFamily: FontFamily.extraBold, color: Colors.white, marginBottom: 2 },
  headerCity: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.75)', marginBottom: Spacing[2] },
  verifiedBadge: { backgroundColor: Colors.leaf, paddingHorizontal: Spacing[3], paddingVertical: 3, borderRadius: Radius.full },
  verifiedText: { fontSize: FontSize.xs, fontFamily: FontFamily.bold, color: Colors.white },
  unverifiedBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing[3], paddingVertical: 3, borderRadius: Radius.full },
  unverifiedText: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: 'rgba(255,255,255,0.8)' },

  scroll: { flex: 1 },
  content: { padding: Spacing[4], paddingBottom: Spacing[10] },

  section: { marginBottom: Spacing[4] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[2] },
  sectionTitle: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  editLink: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.forest },

  card: { backgroundColor: Colors.white, borderRadius: Radius.card, padding: Spacing[4], ...Shadows.soft },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing[2], borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.inkMuted },
  infoValue: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.ink },

  editBtnRow: { flexDirection: 'row', gap: Spacing[3], marginTop: Spacing[2] },
  cancelBtn: { flex: 1 },
  saveBtn: { flex: 2 },

  langRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  langLabel: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.ink },
  langSubLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.inkFaint, marginTop: 2 },

  roleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: Spacing[2] },
  roleLeft: { flex: 1 },
  institutionName: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.inkMuted, marginTop: 3 },
  roleDetail: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.inkFaint, marginTop: 2 },
  primaryBadge: { backgroundColor: Colors.leafPale, paddingHorizontal: Spacing[2], paddingVertical: 2, borderRadius: Radius.full },
  primaryBadgeText: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.forest },
  divider: { height: 1, backgroundColor: Colors.border },

  signOutBtn: { backgroundColor: Colors.white, borderRadius: Radius.card, padding: Spacing[4], alignItems: 'center', marginTop: Spacing[2], ...Shadows.soft },
  signOutText: { fontSize: FontSize.base, fontFamily: FontFamily.semiBold, color: Colors.terra },

  version: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.inkFaint, textAlign: 'center', marginTop: Spacing[4] },
});
