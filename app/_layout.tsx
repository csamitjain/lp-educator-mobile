/**
 * Root Layout — LP Educator Hub
 *
 * Responsibilities:
 * 1. Load Baloo 2 fonts
 * 2. Initialize i18next (local + Supabase DB overrides)
 * 3. TanStack Query with offline AsyncStorage persistence
 * 4. EducatorProvider + RoleProvider
 * 5. SplashScreen until ready
 * 6. Auth gate routing
 * 7. Push notification setup
 * 8. Error boundary
 */

import '../global.css';
import 'react-native-url-polyfill/auto';

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import {
  Baloo2_400Regular,
  Baloo2_500Medium,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from '@expo-google-fonts/baloo-2';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { initI18n } from '@/lib/i18n';
import { EducatorProvider, useEducator } from '@/lib/educator-context';
import { RoleProvider } from '@/lib/role-context';
import { StorageKeys } from '@/lib/constants';
import {
  setupAndroidNotificationChannel,
  setupNotificationTapHandler,
  handleLastNotification,
} from '@/lib/push';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Colors } from '../theme';

// ─── Splash ───────────────────────────────────────────────────────────────────

SplashScreen.preventAutoHideAsync();

// ─── Query Client + Offline Persister ────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,        // 2 min fresh
      gcTime: 24 * 60 * 60 * 1000,     // 24 hr in cache
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: StorageKeys.queryCache,
  throttleTime: 3000,
});

// ─── Auth Gate ────────────────────────────────────────────────────────────────

function AuthGate({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const { profile, isLoading, userId } = useEducator();

  // Register push after profile loads
  usePushNotifications();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!userId) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    if (userId && !profile) {
      if (segments.join('/') !== '(auth)/onboarding') {
        router.replace('/(auth)/onboarding');
      }
      return;
    }

    if (userId && profile && inAuthGroup) {
      router.replace('/(tabs)/dashboard');
    }
  }, [userId, profile, isLoading, segments]);

  return <>{children}</>;
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          Baloo2_400Regular,
          Baloo2_500Medium,
          Baloo2_600SemiBold,
          Baloo2_700Bold,
          Baloo2_800ExtraBold,
        });
        await initI18n();
        await setupAndroidNotificationChannel();
      } catch (e) {
        console.warn('[RootLayout] Prepare error:', e);
      } finally {
        setAppReady(true);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (!appReady) return;
    const removeTap = setupNotificationTapHandler();
    handleLastNotification();
    SplashScreen.hideAsync();
    return () => removeTap();
  }, [appReady]);

  if (!appReady) return null;

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <EducatorProvider>
          <RoleProvider>
            <AuthGate>
              <StatusBar backgroundColor={Colors.forestDeep} barStyle="light-content" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="classes/index" />
                <Stack.Screen name="milestones/index" />
              </Stack>
            </AuthGate>
          </RoleProvider>
        </EducatorProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}
