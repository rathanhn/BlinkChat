
'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { ref, onValue, off, get } from 'firebase/database';
import { auth, db } from '@/lib/firebase';

type Conversation = {
    chatId: string;
    otherUser: {
        uid: string;
        name: string;
        avatar: string;
    };
    lastMessage: {
        text: string;
        timestamp: number;
        senderId: string;
    } | null;
    isUnread: boolean;
    currentUserId: string;
}

interface MessageContextType {
  conversations: Conversation[];
  unreadCount: number;
  isLoading: boolean;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function MessageProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
      const dmsRef = ref(db, 'dms');
      
      const listener = onValue(dmsRef, async (snapshot) => {
          if (!snapshot.exists()) {
              setConversations([]);
              setUnreadCount(0);
              setIsLoading(false);
              return;
          }

          const allDms = snapshot.val();
          const userDms = Object.entries(allDms).filter(([_, chatData]: [string, any]) => 
              chatData.participants && chatData.participants[currentUser.uid]
          );

          const chatPromises: Promise<Conversation | null>[] = [];
          userDms.forEach(([chatId, chatData]) => {
            const otherUserId = Object.keys(chatData.participants).find(uid => uid !== currentUser.uid);

            if (!otherUserId) return;

            const chatPromise = (async (): Promise<Conversation | null> => {
              try {
                const userSnapshot = await get(ref(db, `users/${otherUserId}`));
                if (!userSnapshot.exists()) return null;
                const otherUser = userSnapshot.val();
                
                const lastMessage = chatData.lastMessage || null;
                const lastReadTimestamp = chatData.participants[currentUser.uid]?.lastRead || 0;
                const isUnread = lastMessage && lastMessage.timestamp > lastReadTimestamp && lastMessage.senderId !== currentUser.uid;

                return {
                  chatId,
                  otherUser: { uid: otherUserId, name: otherUser.name, avatar: otherUser.avatar },
                  lastMessage,
                  isUnread,
                  currentUserId: currentUser.uid,
                };
              } catch (error) {
                console.error("Error processing chat for context: ", error);
                return null;
              }
            })();
            chatPromises.push(chatPromise);
          });
          
          const resolvedConversations = (await Promise.all(chatPromises))
              .filter((c): c is Conversation => c !== null)
              .sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));

          setConversations(resolvedConversations);
          setUnreadCount(resolvedConversations.filter(c => c.isUnread).length);
          setIsLoading(false);
      });

      return () => off(dmsRef, 'value', listener);
    } else {
      setConversations([]);
      setUnreadCount(0);
      setIsLoading(false);
    }
  }, [currentUser]);

  return (
    <MessageContext.Provider value={{ conversations, unreadCount, isLoading }}>
      {children}
    </MessageContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
}
