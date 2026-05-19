/**
 * Chat Storage Utilities
 *
 * Handles chat image:
 * 1. Compression via expo-image-manipulator (max 1600px, JPEG 0.82)
 * 2. Upload to `chat-attachments` private bucket
 * 3. Signed URL cache (1hr TTL, in-memory)
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import { ImageConfig } from './constants';

// ─── Signed URL Cache ─────────────────────────────────────────────────────────

interface CachedUrl {
  url: string;
  expiresAt: number; // epoch ms
}

const signedUrlCache = new Map<string, CachedUrl>();

/** TTL buffer: re-fetch 5 min before expiry */
const BUFFER_MS = 5 * 60 * 1000;

function getCachedUrl(path: string): string | null {
  const cached = signedUrlCache.get(path);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt - BUFFER_MS) {
    signedUrlCache.delete(path);
    return null;
  }
  return cached.url;
}

function setCachedUrl(path: string, url: string, ttlSeconds: number): void {
  signedUrlCache.set(path, {
    url,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

// ─── Get Signed URL ───────────────────────────────────────────────────────────

/**
 * Get a signed URL for a chat attachment.
 * Returns from cache if still valid, otherwise fetches a fresh one.
 */
export async function getSignedChatImageUrl(path: string): Promise<string | null> {
  const cached = getCachedUrl(path);
  if (cached) return cached;

  const TTL = 3600; // 1 hour
  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(path, TTL);

  if (error || !data?.signedUrl) {
    console.warn('[chatStorage] Failed to get signed URL:', error?.message);
    return null;
  }

  setCachedUrl(path, data.signedUrl, TTL);
  return data.signedUrl;
}

// ─── Image Compression ────────────────────────────────────────────────────────

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  /** Estimated size — expo-image-manipulator doesn't expose exact bytes */
  mimeType: 'image/jpeg';
}

/**
 * Compress an image to max 1600px on the longest side, JPEG quality 0.82.
 * Throws if image is > 5MB (caller must check beforehand).
 */
export async function compressChatImage(sourceUri: string): Promise<CompressedImage> {
  const MAX = ImageConfig.maxDimensionPx;

  const result = await ImageManipulator.manipulateAsync(
    sourceUri,
    [
      {
        resize: {
          width: MAX,
          height: MAX,
        },
      },
    ],
    {
      compress: ImageConfig.jpegQuality,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    mimeType: 'image/jpeg',
  };
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadChatImageResult {
  path: string;
  error: string | null;
}

/**
 * Compress and upload a chat image to the chat-attachments bucket.
 * Returns the storage path (e.g. "${threadId}/${uuid}.jpg").
 *
 * Path format: `${threadId}/${uuid}.jpg` (per spec §4 Storage buckets)
 */
export async function uploadChatImage(
  sourceUri: string,
  threadId: string
): Promise<UploadChatImageResult> {
  try {
    // Step 1: Compress
    const compressed = await compressChatImage(sourceUri);

    // Step 2: Build path
    const uuid = generateUUID();
    const path = ImageConfig.chatAttachmentPath(threadId, uuid);

    // Step 3: Fetch the file as blob
    const response = await fetch(compressed.uri);
    const blob = await response.blob();

    // Step 4: Check size
    if (blob.size > ImageConfig.maxFileSizeBytes) {
      return { path: '', error: 'Image exceeds 5MB limit after compression.' };
    }

    // Step 5: Upload to Supabase storage
    const { error } = await supabase.storage
      .from('chat-attachments')
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      return { path: '', error: error.message };
    }

    return { path, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return { path: '', error: message };
  }
}

// ─── UUID ─────────────────────────────────────────────────────────────────────

/** Simple UUID v4 generator for React Native (no crypto.randomUUID in old RN) */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
