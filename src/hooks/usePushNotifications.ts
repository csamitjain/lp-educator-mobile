/**
 * usePushNotifications
 *
 * Call this once after the educator is authenticated and profile is loaded.
 * Registers for push token, saves to Supabase, sets up foreground handler.
 * All operations are graceful no-ops if push is not configured.
 */
import { useEffect, useRef } from 'react';
import { useEducator } from '@/lib/educator-context';
import {
  registerForPushNotifications,
  configureForegroundHandler,
} from '@/lib/push';

export function usePushNotifications(currentThreadId: string | null = null) {
  const { profile } = useEducator();
  const registeredRef = useRef(false);

  // Register token once after profile loads
  useEffect(() => {
    if (!profile || registeredRef.current) return;
    registeredRef.current = true;
    registerForPushNotifications(profile.id).catch(() => {});
  }, [profile?.id]);

  // Foreground handler — suppress banner if already in that thread
  useEffect(() => {
    const remove = configureForegroundHandler(currentThreadId);
    return remove;
  }, [currentThreadId]);
}
