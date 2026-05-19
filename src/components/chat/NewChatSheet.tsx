import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  FlatList, TextInput, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useEducator } from '@/lib/educator-context';
import { searchChatStudents, findOrCreateThread, type ChatStudentResult } from '@/hooks/useChatMessages';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../../theme';
import StudentAvatar from '@/components/StudentAvatar';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function NewChatSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, userId } = useEducator();

  const [students, setStudents] = useState<ChatStudentResult[]>([]);
  const [filtered, setFiltered] = useState<ChatStudentResult[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [navigating, setNavigating] = useState<string | null>(null);

  useEffect(() => {
    if (visible && profile) {
      setLoading(true);
      searchChatStudents(profile.id)
        .then((results) => {
          setStudents(results);
          setFiltered(results);
        })
        .catch(console.warn)
        .finally(() => setLoading(false));
    }
  }, [visible, profile]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(students);
    } else {
      setFiltered(
        students.filter((s) =>
          s.name.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, students]);

  async function handleSelectStudent(student: ChatStudentResult) {
    if (!userId || navigating) return;
    setNavigating(student.childId);
    try {
      const threadId = await findOrCreateThread({
        childId: student.childId,
        educatorUserId: userId,
        parentUserId: student.parentUserId,
        teacherLinkId: student.teacherLinkId,
      });
      onClose();
      router.push(`/(tabs)/chat/${threadId}` as any);
    } catch (err) {
      console.warn('[NewChat] Failed to create thread:', err);
    } finally {
      setNavigating(null);
    }
  }

  function handleClose() {
    setSearch('');
    setStudents([]);
    setFiltered([]);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('chat.new_sheet.title')}</Text>

          {/* Search */}
          <TextInput
            style={styles.searchInput}
            placeholder={t('chat.new_sheet.search_placeholder')}
            placeholderTextColor={Colors.inkFaint}
            value={search}
            onChangeText={setSearch}
          />

          {loading ? (
            <ActivityIndicator color={Colors.forest} style={styles.loader} />
          ) : filtered.length === 0 ? (
            <Text style={styles.emptyText}>{t('chat.new_sheet.no_students')}</Text>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.childId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.studentRow}
                  onPress={() => handleSelectStudent(item)}
                  activeOpacity={0.75}
                >
                  <StudentAvatar name={item.name} avatarUrl={item.avatarUrl} size="md" />
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{item.name}</Text>
                    {item.nameHi && (
                      <Text style={styles.studentNameHi}>{item.nameHi}</Text>
                    )}
                  </View>
                  {navigating === item.childId ? (
                    <ActivityIndicator size="small" color={Colors.forest} />
                  ) : (
                    <Text style={styles.chevron}>›</Text>
                  )}
                </TouchableOpacity>
              )}
              style={styles.list}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    padding: Spacing[5],
    maxHeight: '80%',
    ...Shadows.sheet,
  },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing[4] },
  title: { fontSize: FontSize.xl, fontFamily: FontFamily.extraBold, color: Colors.ink, marginBottom: Spacing[3] },
  searchInput: {
    backgroundColor: Colors.cream, borderRadius: Radius.md,
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[2],
    fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.ink,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing[3],
  },
  loader: { marginTop: Spacing[6] },
  emptyText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.inkFaint, textAlign: 'center', marginTop: Spacing[6] },
  list: { maxHeight: 400 },
  studentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[3], gap: Spacing[3], borderBottomWidth: 1, borderBottomColor: Colors.border },
  studentInfo: { flex: 1 },
  studentName: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.ink },
  studentNameHi: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.inkMuted, marginTop: 1 },
  chevron: { fontSize: 22, color: Colors.inkFaint },
});
