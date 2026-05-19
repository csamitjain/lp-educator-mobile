/**
 * useAuthReady
 *
 * Resolves the auth state before any routing decisions are made.
 * Avoids flash of wrong screen (login → dashboard flicker, or vice versa).
 *
 * Returns:
 *   - isReady: true once auth state is known (not loading)
 *   - isAuthenticated: true if a valid session exists
 *   - userId: current user ID or null
 *   - needsOnboarding: true if authenticated but no educator_profile
 *   - needsRoleSetup: true if profile exists but no role instances
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useEducator } from '@/lib/educator-context';
import { useRole } from '@/lib/role-context';

export type AuthState =
  | 'loading'
  | 'unauthenticated'
  | 'needs_onboarding'
  | 'needs_role_setup'
  | 'ready';

export function useAuthReady() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const { profile, isLoading: profileLoading } = useEducator();
  const { roleInstances, isLoading: roleLoading } = useRole();

  // Check session once on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      setIsAuthenticated(!!session);
      setUserId(session?.user.id ?? null);
      setSessionChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthenticated(!!session);
      setUserId(session?.user.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Derive auth state
  let authState: AuthState = 'loading';

  if (sessionChecked) {
    if (!isAuthenticated) {
      authState = 'unauthenticated';
    } else if (profileLoading || roleLoading) {
      authState = 'loading';
    } else if (!profile) {
      authState = 'needs_onboarding';
    } else if (roleInstances.length === 0) {
      authState = 'needs_role_setup';
    } else {
      authState = 'ready';
    }
  }

  return {
    authState,
    isReady: authState !== 'loading',
    isAuthenticated,
    userId,
    profile,
  };
}
