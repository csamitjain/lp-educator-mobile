/**
 * Push Notification Service
 *
 * Architecture:
 * - Registers for Expo push token on login
 * - Saves token to educator_profiles.push_token (graceful no-op if column missing)
 * - Handles foreground notifications → in-app toast
 * - Deep links: notification tap → /chat/[threadId]
 *
 * All operations are wrapped in try/catch — push is non-critical.
 * The app ships and works fully without push notifications configured.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from './supabase';

// ─── Android Channel ──────────────────────────────────────────────────────────

export async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('chat', {
    name: 'Chat Messages',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1A5C44',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('general', {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

// ─── Token Registration ───────────────────────────────────────────────────────

/**
 * Register for push notifications and save token to Supabase.
 * Gracefully skips if:
 *   - Not a physical device (simulator)
 *   - Permission denied
 *   - push_token column doesn't exist on educator_profiles
 */
export async function registerForPushNotifications(educatorProfileId: string): Promise<void> {
  try {
    if (!Device.isDevice) {
      console.log('[Push] Skipped: not a physical device');
      return;
    }

    // Request permissions (Android 13+ requires explicit permission)
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission not granted — skipping token registration');
      return;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '02acb70c-5639-4829-ba45-8ad8d09762a8',
    });

    const token = tokenData.data;
    console.log('[Push] Expo push token:', token);

    // Save to educator_profiles.push_token
    // Graceful no-op if column doesn't exist (will fail silently)
    const { error } = await supabase
      .from('educator_profiles')
      .update({ push_token: token } as any)
      .eq('id', educatorProfileId);

    if (error) {
      // Column may not exist yet — this is expected before backend adds it
      console.warn('[Push] Failed to save push token (column may not exist):', error.message);
    } else {
      console.log('[Push] Token saved to educator_profiles');
    }
  } catch (err) {
    console.warn('[Push] Registration error (non-critical):', err);
  }
}

// ─── Foreground Handler ───────────────────────────────────────────────────────

/**
 * Configure how notifications behave when the app is in the foreground.
 * Chat notifications are suppressed as in-app banners when user is in that thread.
 */
export function configureForegroundHandler(
  currentThreadId: string | null = null,
  showToast?: (title: string, body: string) => void
): () => void {
  // Set handler: show alert + play sound unless user is in that thread
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data as { threadId?: string } | null;
      const threadId = data?.threadId;

      // Suppress system banner if user is already in this thread
      if (threadId && threadId === currentThreadId) {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      }

      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });

  // Listen for foreground notifications
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as { threadId?: string } | null;
    const threadId = data?.threadId;

    // If user is NOT in this thread, show in-app toast
    if (threadId && threadId !== currentThreadId && showToast) {
      const title = notification.request.content.title ?? 'New Message';
      const body = notification.request.content.body ?? '';
      showToast(title, body);
    }
  });

  return () => subscription.remove();
}

// ─── Deep Link Handler ────────────────────────────────────────────────────────

/**
 * Handle notification tap — navigate to the relevant screen.
 * Called once on app start and on notification tap.
 */
export function setupNotificationTapHandler(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as {
      threadId?: string;
      type?: string;
    } | null;

    if (!data) return;

    if (data.threadId) {
      // Navigate to chat thread
      router.push(`/chat/${data.threadId}` as any);
    }
  });

  return () => subscription.remove();
}

// ─── Handle Last Notification (app opened from killed state) ─────────────────

export async function handleLastNotification(): Promise<void> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return;

    const data = response.notification.request.content.data as { threadId?: string } | null;
    if (data?.threadId) {
      // Small delay to ensure router is ready
      setTimeout(() => {
        router.push(`/chat/${data.threadId}` as any);
      }, 500);
    }
  } catch {
    // Non-critical
  }
}

// ─── Contract (for backend team) ─────────────────────────────────────────────
/*
  PUSH NOTIFICATION CONTRACT
  ===========================

  When a parent sends a chat message (chat_messages INSERT where sender_role='parent'),
  the Supabase edge function `send-push` should:

  1. Look up the educator_user_id from chat_threads.educator_user_id
  2. Fetch educator_profiles.push_token for that user
  3. Send an Expo push notification:

  POST https://exp.host/--/api/v2/push/send
  {
    "to": "<expo_push_token>",
    "title": "<child_name>",
    "body": "<message_preview>",
    "data": {
      "threadId": "<thread_id>",
      "type": "chat_message"
    },
    "channelId": "chat"   // Android only
  }

  Edge function trigger SQL:
  CREATE TRIGGER on_chat_message_insert
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    WHEN (NEW.sender_role = 'parent')
    EXECUTE FUNCTION supabase_functions.http_request(
      'https://<project>.supabase.co/functions/v1/send-push',
      'POST',
      '{"Content-Type": "application/json"}',
      '{}',
      '5000'
    );
*/
