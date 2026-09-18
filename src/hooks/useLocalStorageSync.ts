/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useRef } from 'react';

/**
 * Generic hook to sync a value to localStorage when it changes.
 * Replaces multiple individual useEffect blocks for localStorage persistence.
 * 
 * @param key - The localStorage key to use
 * @param value - The value to persist
 * @param isActive - Whether syncing is active (e.g., local-only mode)
 */
export function useLocalStorageSync<T>(
  key: string,
  value: T,
  isActive: boolean
): void {
  const previousValueRef = useRef<T | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Avoid redundant writes if value hasn't changed
    if (JSON.stringify(value) === JSON.stringify(previousValueRef.current)) {
      return;
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
      previousValueRef.current = value;
    } catch {
      // Storage full / unavailable — non-fatal
    }
  }, [key, value, isActive]);
}

/**
 * Hook to load initial value from localStorage with a fallback.
 * 
 * @param key - The localStorage key to use
 * @param fallback - Fallback value if nothing is stored
 * @returns The loaded or fallback value
 */
export function useLocalStorageInitial<T>(key: string, fallback: T): T {
  const getValue = (): T => {
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  return getValue();
}
