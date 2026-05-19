import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEducator } from '@/lib/educator-context';
import { useRole } from '@/lib/role-context';
import { QueryKeys } from '@/lib/constants';
import { searchChildByPhone, type ChildSearchResult } from '@/hooks/useStudents';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../../theme';
import TextInput from '@/components/ui/TextInput';
import PrimaryButton from '@/components/ui/PrimaryButton';
import StudentAvatar from '@/components/StudentAvatar';
import Toast from '@/components/ui/Toast';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AddStudentSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, userId } = useEducator();
  const { activeRole } = useRole();

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<ChildSearchResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', visible: false });

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type, visible: true });
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setResult(null);
    setNotFound(false);

    try {
      const found = await searchChildByPhone(searchQuery.trim());
      if (found) {
        setResult(found);
      } else {
        setNotFound(true);
      }
    } catch {
      showToast(t('errors.server'), 'error');
    } finally {
      setSearching(false);
    }
  }

  async function handleSendRequest() {
    if (!result || !profile || !activeRole || !userId) return;
    setSending(true);

    try {
      // Check if already linked
      const { data: existing } = await supabase
        .from('educator_students')
        .select('id, approval_status')
        .eq('educator_id', profile.id)
        .eq('child_id', result.childId)
        .maybeSingle();

      if (existing) {
        showToast(t('students.add.already_linked'), 'error');
        return;
      }

      // Create educator_students row
      const { error: linkError } = await supabase
        .from('educator_students')
        .insert({
          educator_id: profile.id,
          role_instance_id: activeRole.id,
          child_id: result.childId,
          approval_status: 'pending',
        });

      if (linkError) throw new Error(linkError.message);

      // Also create child_teacher_links row (used in chat flows)
      await supabase
        .from('child_teacher_links')
        .upsert({
          educator_id: profile.id,
          child_id: result.childId,
          parent_user_id: result.parentUserId,
          approval_status: 'pending',
        });

      // Create notification for parent
      await supabase.from('notifications').insert({
        user_id: result.parentUserId,
        type: 'student_link_request',
        title: 'New Link Request',
        body: `${profile.full_name} wants to link with your child.`,
        data: { educator_id: profile.id, child_id: result.childId },
      });

      // Invalidate students query
      queryClient.invalidateQueries({
        queryKey: QueryKeys.students(profile.id, activeRole.id),
      });

      showToast(t('students.add.request_sent'), 'success');
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('errors.save_failed');
      showToast(msg, 'error');
    } finally {
      setSending(false);
    }
  }

  function handleClose() {
    setSearchQuery('');
    setResult(null);
    setNotFound(false);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />

        <View style={styles.sheet}>
          <Toast
            message={toast.message}
            type={toast.type}
            visible={toast.visible}
            onHide={() => setToast((p) => ({ ...p, visible: false }))}
          />

          {/* Handle */}
          <View style={styles.handle} />

          <Text style={styles.title}>{t('students.add.title')}</Text>

          {/* Search */}
          <TextInput
            label={t('students.add.search_label')}
            placeholder={t('students.add.search_placeholder')}
            value={searchQuery}
            onChangeText={(v) => {
              setSearchQuery(v);
              setResult(null);
              setNotFound(false);
            }}
            keyboardType="phone-pad"
          />

          <PrimaryButton
            label={searching ? t('common.loading') : t('buttons.search')}
            loading={searching}
            onPress={handleSearch}
            disabled={!searchQuery.trim()}
            variant="secondary"
            style={styles.searchBtn}
          />

          {/* Not found */}
          {notFound && (
            <View style={styles.notFound}>
              <Text style={styles.notFoundText}>{t('students.add.no_results')}</Text>
            </View>
          )}

          {/* Result */}
          {result && (
            <View style={styles.resultCard}>
              <Text style={styles.foundLabel}>{t('students.add.found_child')}</Text>
              <View style={styles.resultRow}>
                <StudentAvatar
                  name={result.name}
                  avatarUrl={result.avatarUrl}
                  size="md"
                />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{result.name}</Text>
                  {result.nameHi && (
                    <Text style={styles.resultNameHi}>{result.nameHi}</Text>
                  )}
                </View>
              </View>

              <PrimaryButton
                label={sending ? t('common.loading') : t('students.add.send_request')}
                loading={sending}
                onPress={handleSendRequest}
                style={styles.sendBtn}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
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
    marginBottom: Spacing[4],
  },
  searchBtn: {
    marginTop: -Spacing[2],
  },
  notFound: {
    alignItems: 'center',
    paddingVertical: Spacing[4],
  },
  notFoundText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.inkMuted,
  },
  resultCard: {
    marginTop: Spacing[4],
    backgroundColor: Colors.leafPale,
    borderRadius: Radius.card,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.leaf,
  },
  foundLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.forest,
    marginBottom: Spacing[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bold,
    color: Colors.ink,
  },
  resultNameHi: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.inkMuted,
  },
  sendBtn: {
    marginTop: Spacing[1],
  },
});
