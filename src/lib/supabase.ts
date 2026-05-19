import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// ─── Config ─────────────────────────────────────────────────────────────────
// These are publishable anon values — safe to ship in client.

const SUPABASE_URL = 'https://bcbaswoqiyavzjxynbek.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjYmFzd29xaXlhdnpqeHluYmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5OTgzNDAsImV4cCI6MjA5MTU3NDM0MH0.8yoGoGFn_kvtYf5yjt5_RRMKPsTL1itR6Xtfj_c1Svw';

// ─── Client ──────────────────────────────────────────────────────────────────

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// ─── Storage helpers ─────────────────────────────────────────────────────────

export const StorageBuckets = {
  profileAvatars: 'profile-avatars',
  chatAttachments: 'chat-attachments',
} as const;

/**
 * Get a public URL for profile avatars bucket (public bucket).
 */
export function getPublicAvatarUrl(path: string): string {
  const { data } = supabase.storage.from(StorageBuckets.profileAvatars).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Create a signed URL for chat attachments (private bucket).
 * Cache should be handled by the caller (chatStorage.ts).
 */
export async function createSignedChatUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(StorageBuckets.chatAttachments)
    .createSignedUrl(path, expiresIn);

  if (error || !data) {
    console.warn('[Supabase] Failed to create signed URL:', error?.message);
    return null;
  }
  return data.signedUrl;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Send OTP to Indian mobile number.
 * Supabase expects the number WITHOUT the + prefix: "91XXXXXXXXXX"
 */
export async function sendPhoneOtp(phone: string): Promise<{ error: string | null }> {
  const normalized = normalizeIndianPhone(phone);
  const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
  return { error: error?.message ?? null };
}

/**
 * Verify OTP and sign in.
 */
export async function verifyPhoneOtp(
  phone: string,
  token: string
): Promise<{ error: string | null }> {
  const normalized = normalizeIndianPhone(phone);
  const { error } = await supabase.auth.verifyOtp({
    phone: normalized,
    token,
    type: 'sms',
  });
  return { error: error?.message ?? null };
}

/**
 * Normalize Indian phone: accepts "9876543210" or "+919876543210" or "919876543210"
 * Returns "919876543210" (no +, with country code).
 */
export function normalizeIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export type SupabaseClient = typeof supabase;
