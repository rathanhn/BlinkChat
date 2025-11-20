
'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { ref, onValue, off } from 'firebase/database';
import { auth, db } from '@/lib/firebase';

interface NotificationContextType {
  pendingCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
      const notificationsRef = ref(db, `notifications/${currentUser.uid}`);
      const listener = onValue(notificationsRef, (snapshot) => {
        const data = snapshot.val();
        let count = 0;
        if (data) {
          Object.values(data).forEach((notification: any) => {
            if (notification.status === 'pending') {
              count++;
            }
          });
        }
        setPendingCount(count);
      });

      return () => off(notificationsRef, 'value', listener);
    } else {
      setPendingCount(0);
    }
  }, [currentUser]);

  return (
    <NotificationContext.Provider value={{ pendingCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
