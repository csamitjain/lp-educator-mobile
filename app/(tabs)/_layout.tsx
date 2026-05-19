import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, FontFamily, FontSize } from '../../theme';
import { useEducator } from '@/lib/educator-context';
import { useRole } from '@/lib/role-context';
import { useChatUnread } from '@/hooks/useChatUnread';
import { roleHasFee } from '@/lib/constants';

// ─── Unread Badge ─────────────────────────────────────────────────────────────

function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

// ─── Tab Icon ─────────────────────────────────────────────────────────────────

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>{emoji}</Text>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  const { t } = useTranslation();
  const { userId } = useEducator();
  const { activeRole } = useRole();
  const { data: unreadCount = 0 } = useChatUnread(userId);

  const showFee = activeRole ? roleHasFee(activeRole.role) : false;

  const tabBarStyle = {
    backgroundColor: Colors.white,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  };

  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: Colors.forest,
    tabBarInactiveTintColor: Colors.inkFaint,
    tabBarStyle,
    tabBarLabelStyle: {
      fontSize: FontSize.xs,
      fontFamily: FontFamily.semiBold,
    },
  };

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('nav.today'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="students/index"
        options={{
          title: t('nav.students'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="attendance"
        options={{
          title: t('nav.attendance'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="✅" focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="observations"
        options={{
          title: t('nav.notes'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="📝" focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="chat/index"
        options={{
          title: t('nav.chat'),
          tabBarIcon: ({ focused }) => (
            <View>
              <TabIcon emoji="💬" focused={focused} />
              <UnreadBadge count={unreadCount} />
            </View>
          ),
        }}
      />

      {/* Fee tab — only visible for tutor/counselor */}
      <Tabs.Screen
        name="fee/index"
        options={{
          title: t('nav.fee'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="💰" focused={focused} />,
          href: showFee ? undefined : null, // null hides the tab
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />

      {/* Hidden screens — accessible via navigation but not in tab bar */}
      <Tabs.Screen name="students/[id]" options={{ href: null }} />
      <Tabs.Screen name="fee/plans" options={{ href: null }} />
      <Tabs.Screen name="chat/[threadId]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabEmoji: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabEmojiFocused: {
    opacity: 1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.terra,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
});
