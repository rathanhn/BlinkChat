'use client';

import { useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { ref, get, set, onDisconnect, serverTimestamp } from 'firebase/database';

/**
 * Keeps users/{uid}/online and users/{uid}/status in sync globally.
 * - Sets online=true on mount for authenticated users
 * - If not searching/chatting, sets status.state to 'online'
 * - Registers onDisconnect to mark user offline with timestamp
 * - Does not override searching/chatting states
 */
export function PresenceManager() {
  useEffect(() => {
    let currentUser: FirebaseUser | null = null;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      if (!user) return;

      const onlineRef = ref(db, `users/${user.uid}/online`);
      const statusRef = ref(db, `users/${user.uid}/status`);

      try {
        // Mark online immediately
        await set(onlineRef, true);

        // Respect existing states: only set to online if not searching/chatting
        const statusSnap = await get(statusRef);
        const statusVal = statusSnap.val();
        const isBusy = statusVal && (statusVal.state === 'searching' || statusVal.state === 'chatting');
        if (!isBusy) {
          await set(statusRef, { state: 'online', last_changed: serverTimestamp() });
        }

        // Ensure offline on disconnect
        onDisconnect(onlineRef).set(false);
        onDisconnect(statusRef).set({ state: 'offline', last_changed: serverTimestamp() });
      } catch (e) {
        // Swallow to avoid UI disruption; can add logging later
      }
    });

    return () => {
      unsubscribe();
      // Do not force offline here to avoid flicker during route transitions
    };
  }, []);

  return null;
}


