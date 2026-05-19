import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useEducator } from '@/lib/educator-context';
import { useStudents } from '@/hooks/useStudents';
import {
  useAddMilestone,
  useUpsertMilestoneRecord,
  useBulkUpsertMilestoneRecords,
  type MilestoneRecordRow,
} from '@/hooks/useMilestones';
import { MILESTONE_CATEGORIES } from '@/lib/constants';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../../theme';
import TextInput from '@/components/ui/TextInput';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Toast from '@/components/ui/Toast';
import type { Milestone, MilestoneStatus } from '@/types/database';
import type { RoleInstance } from '@/types/database';

const MILESTONE_STATUSES: MilestoneStatus[] = ['pending', 'in_progress', 'achieved'];

// ─── Add Template Sheet ────────────────────────────────────────────────────────

interface AddTemplateProps {
  visible: boolean;
  onClose: () => void;
}

export function AddMilestoneTemplateSheet({ visible, onClose }: AddTemplateProps) {
  const { t } = useTranslation();
  const { profile } = useEducator();
  const { mutateAsync: addMilestone } = useAddMilestone();

  const [title, setTitle] = useState('');
  const [titleHi, setTitleHi] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', visible: false });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = t('errors.required_field');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate() || !profile) return;
    setSaving(true);
    try {
      await addMilestone({
        educatorId: profile.id,
        title: title.trim(),
        titleHi: titleHi.trim() || null,
        description: description.trim() || null,
        category,
      });
      setToast({ message: t('milestones.saved'), type: 'success', visible: true });
      setTimeout(handleClose, 1200);
    } catch {
      setToast({ message: t('errors.save_failed'), type: 'error', visible: true });
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setTitle(''); setTitleHi(''); setDescription(''); setCategory(null); setErrors({});
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <Toast message={toast.message} type={toast.type} visible={toast.visible}
            onHide={() => setToast((p) => ({ ...p, visible: false }))} />
          <View style={styles.handle} />
          <Text style={styles.title}>{t('milestones.add_template')}</Text>

          <TextInput label={t('milestones.template_title_label')} value={title}
            onChangeText={(v) => { setTitle(v); setErrors((e) => ({ ...e, title: '' })); }}
            error={errors.title} required />
          <TextInput label={t('milestones.template_title_hi_label')} value={titleHi}
            onChangeText={setTitleHi} placeholder="हिंदी में शीर्षक" />
          <TextInput label={t('milestones.template_desc_label')} value={description}
            onChangeText={setDescription} multiline numberOfLines={3}
            style={{ height: 80, textAlignVertical: 'top' }} />

          <Text style={styles.label}>{t('milestones.category_label')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
            {MILESTONE_CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat}
                style={[styles.chip, category === cat && styles.chipSelected]}
                onPress={() => setCategory(category === cat ? null : cat)}>
                <Text style={[styles.chipText, category === cat && styles.chipTextSelected]}>
                  {t(`milestones.category.${cat}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <PrimaryButton label={saving ? t('milestones.saving') : t('buttons.save')}
            loading={saving} onPress={handleSave} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Mark Single Sheet ─────────────────────────────────────────────────────────

interface MarkSingleProps {
  visible: boolean;
  milestone: Milestone | null;
  onClose: () => void;
  activeRole: RoleInstance | null;
}

export function MarkSingleSheet({ visible, milestone, onClose, activeRole }: MarkSingleProps) {
  const { t } = useTranslation();
  const { profile } = useEducator();
  const { data: students = [] } = useStudents(profile, activeRole);
  const { mutateAsync: upsert } = useUpsertMilestoneRecord();

  const approved = students.filter((s) => s.approvalStatus === 'approved');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [status, setStatus] = useState<MilestoneStatus>('achieved');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', visible: false });

  async function handleSave() {
    if (!selectedChildId || !milestone || !profile) return;
    setSaving(true);
    try {
      await upsert({ educatorId: profile.id, childId: selectedChildId, milestoneId: milestone.id, status, note: note.trim() || null });
      setToast({ message: t('milestones.saved'), type: 'success', visible: true });
      setTimeout(handleClose, 1200);
    } catch {
      setToast({ message: t('errors.save_failed'), type: 'error', visible: true });
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setSelectedChildId(null); setStatus('achieved'); setNote('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <Toast message={toast.message} type={toast.type} visible={toast.visible}
            onHide={() => setToast((p) => ({ ...p, visible: false }))} />
          <View style={styles.handle} />
          <Text style={styles.title}>{t('milestones.mark_single')}</Text>
          {milestone && <Text style={styles.milestoneTitle}>{milestone.title}</Text>}

          <Text style={styles.label}>{t('observations.select_student')}<Text style={styles.required}> *</Text></Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
            {approved.map((s) => (
              <TouchableOpacity key={s.childId}
                style={[styles.chip, selectedChildId === s.childId && styles.chipSelected]}
                onPress={() => setSelectedChildId(s.childId)}>
                <Text style={[styles.chipText, selectedChildId === s.childId && styles.chipTextSelected]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>{t('milestones.status_label')}</Text>
          <View style={styles.statusRow}>
            {MILESTONE_STATUSES.map((s) => (
              <TouchableOpacity key={s}
                style={[styles.statusChip, status === s && styles.statusChipSelected]}
                onPress={() => setStatus(s)}>
                <Text style={[styles.statusChipText, status === s && styles.statusChipTextSelected]}>
                  {t(`milestone_status.${s}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput label={t('milestones.note_label')} value={note}
            onChangeText={setNote} multiline numberOfLines={3}
            style={{ height: 80, textAlignVertical: 'top' }} />

          <PrimaryButton label={saving ? t('milestones.saving') : t('buttons.save')}
            loading={saving} onPress={handleSave} disabled={!selectedChildId} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Bulk Mark Sheet ───────────────────────────────────────────────────────────

interface BulkMarkMilestoneProps {
  visible: boolean;
  milestones: Milestone[];
  onClose: () => void;
  activeRole: RoleInstance | null;
}

export function BulkMarkMilestoneSheet({ visible, milestones, onClose, activeRole }: BulkMarkMilestoneProps) {
  const { t } = useTranslation();
  const { profile } = useEducator();
  const { data: students = [] } = useStudents(profile, activeRole);
  const { mutateAsync: bulkUpsert } = useBulkUpsertMilestoneRecords();

  const approved = students.filter((s) => s.approvalStatus === 'approved');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [status, setStatus] = useState<MilestoneStatus>('achieved');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', visible: false });

  function toggleChild(id: string) {
    setSelectedChildIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleSave() {
    if (!selectedMilestoneId || !selectedChildIds.length || !profile) return;
    setSaving(true);
    try {
      await bulkUpsert({ educatorId: profile.id, milestoneId: selectedMilestoneId, childIds: selectedChildIds, status, note: note.trim() || null });
      setToast({ message: t('milestones.saved'), type: 'success', visible: true });
      setTimeout(handleClose, 1200);
    } catch {
      setToast({ message: t('errors.save_failed'), type: 'error', visible: true });
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setSelectedMilestoneId(null); setSelectedChildIds([]); setStatus('achieved'); setNote('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent}>
          <Toast message={toast.message} type={toast.type} visible={toast.visible}
            onHide={() => setToast((p) => ({ ...p, visible: false }))} />
          <View style={styles.handle} />
          <Text style={styles.title}>{t('milestones.bulk_mark_title')}</Text>

          <Text style={styles.label}>{t('milestones.select_milestone')}<Text style={styles.required}> *</Text></Text>
          {milestones.map((m) => (
            <TouchableOpacity key={m.id}
              style={[styles.milestoneOption, selectedMilestoneId === m.id && styles.milestoneOptionSelected]}
              onPress={() => setSelectedMilestoneId(m.id)}>
              <Text style={styles.milestoneOptionText}>{m.title}</Text>
              {selectedMilestoneId === m.id && <Text style={{ color: Colors.forest }}>✓</Text>}
            </TouchableOpacity>
          ))}

          <Text style={[styles.label, { marginTop: Spacing[3] }]}>
            {t('milestones.select_students')}<Text style={styles.required}> *</Text>
          </Text>
          <View style={styles.chipRow}>
            {approved.map((s) => (
              <TouchableOpacity key={s.childId}
                style={[styles.chip, selectedChildIds.includes(s.childId) && styles.chipSelected]}
                onPress={() => toggleChild(s.childId)}>
                <Text style={[styles.chipText, selectedChildIds.includes(s.childId) && styles.chipTextSelected]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: Spacing[3] }]}>{t('milestones.status_label')}</Text>
          <View style={styles.statusRow}>
            {MILESTONE_STATUSES.map((s) => (
              <TouchableOpacity key={s}
                style={[styles.statusChip, status === s && styles.statusChipSelected]}
                onPress={() => setStatus(s)}>
                <Text style={[styles.statusChipText, status === s && styles.statusChipTextSelected]}>
                  {t(`milestone_status.${s}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <PrimaryButton
            label={saving ? t('milestones.saving') : `${t('buttons.save')} (${selectedChildIds.length})`}
            loading={saving} onPress={handleSave}
            disabled={!selectedMilestoneId || selectedChildIds.length === 0}
            style={{ marginTop: Spacing[4] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet, padding: Spacing[5],
    paddingBottom: Spacing[8], maxHeight: '90%', ...Shadows.sheet,
  },
  sheetScroll: { backgroundColor: Colors.white, borderTopLeftRadius: Radius.sheet, borderTopRightRadius: Radius.sheet, maxHeight: '90%' },
  sheetScrollContent: { padding: Spacing[5], paddingBottom: Spacing[10] },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing[4] },
  title: { fontSize: FontSize.xl, fontFamily: FontFamily.extraBold, color: Colors.ink, marginBottom: Spacing[4] },
  milestoneTitle: { fontSize: FontSize.base, fontFamily: FontFamily.semiBold, color: Colors.inkMuted, marginBottom: Spacing[4] },
  label: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.ink, marginBottom: Spacing[2] },
  required: { color: Colors.terra },
  chipScroll: { maxHeight: 44, marginBottom: Spacing[3] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2], marginBottom: Spacing[3] },
  chip: { paddingHorizontal: Spacing[3], paddingVertical: Spacing[1] + 2, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  chipSelected: { borderColor: Colors.forest, backgroundColor: Colors.leafPale },
  chipText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.inkMuted },
  chipTextSelected: { color: Colors.forest },
  statusRow: { flexDirection: 'row', gap: Spacing[2], marginBottom: Spacing[3] },
  statusChip: { flex: 1, alignItems: 'center', paddingVertical: Spacing[2], borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border },
  statusChipSelected: { borderColor: Colors.forest, backgroundColor: Colors.leafPale },
  statusChipText: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, color: Colors.inkMuted },
  statusChipTextSelected: { color: Colors.forest },
  milestoneOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing[3], borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, marginBottom: Spacing[2] },
  milestoneOptionSelected: { borderColor: Colors.forest, backgroundColor: Colors.leafPale },
  milestoneOptionText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: Colors.ink, flex: 1 },
});
