/**
 * EducatorContext
 *
 * Provides the current educator's profile (educator_profiles row) globally.
 * Loaded once after auth, re-used everywhere.
 * Persisted via TanStack Query cache — available offline after first load.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { QueryKeys } from './constants';
import type { EducatorProfile } from '@/types/database';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EducatorContextValue {
  /** The educator's profile row, or null if not loaded yet / not onboarded */
  profile: EducatorProfile | null;
  /** True while the profile is being fetched for the first time */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Current authenticated user ID */
  userId: string | null;
  /** Refetch the profile (e.g. after onboarding, after profile edit) */
  refresh: () => void;
  /** Manually set profile (e.g. immediately after onboarding INSERT) */
  setProfile: (profile: EducatorProfile | null) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const EducatorContext = createContext<EducatorContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function EducatorProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Listen to auth state changes
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUserId(data.session?.user.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUserId(session?.user.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch educator profile when userId is known
  const {
    data: profile = null,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: QueryKeys.educatorProfile(userId ?? ''),
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('educator_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data as EducatorProfile | null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 min
    retry: 2,
  });

  const setProfile = (p: EducatorProfile | null) => {
    if (userId) {
      queryClient.setQueryData(QueryKeys.educatorProfile(userId), p);
    }
  };

  return (
    <EducatorContext.Provider
      value={{
        profile,
        isLoading: !!userId && isLoading,
        error: queryError ? (queryError as Error).message : null,
        userId,
        refresh: () => refetch(),
        setProfile,
      }}
    >
      {children}
    </EducatorContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useEducator(): EducatorContextValue {
  const ctx = useContext(EducatorContext);
  if (!ctx) {
    throw new Error('useEducator must be used inside <EducatorProvider>');
  }
  return ctx;
}

/** Convenience hook — throws if no profile (use inside authenticated screens) */
export function useEducatorProfile(): EducatorProfile {
  const { profile } = useEducator();
  if (!profile) {
    throw new Error('useEducatorProfile: profile not loaded');
  }
  return profile;
}
