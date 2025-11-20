
'use client';

import { AppLayout } from '@/components/app-layout';
import { MessageSquare } from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { ref, onValue, off, get } from 'firebase/database';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type ChatListItem = {
    chatId: string;
    otherUser: {
        uid: string;
        name: string;
        avatar: string;
        status?: { state: string; last_changed: number };
    };
    lastMessage: {
        text: string;
        timestamp: number;
        senderId: string;
    } | null;
    isUnread: boolean;
}

function MessagesSkeleton() {
    return (
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4 rounded-lg">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-4/5 rounded-md" />
                        <Skeleton className="h-4 w-3/4 rounded-md" />
                    </div>
                    <Skeleton className="h-3 w-3 rounded-full ml-2 flex-shrink-0" />
                </div>
            ))}
        </div>
    )
}

export default function MessagesPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [chats, setChats] = useState<ChatListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if(user) {
                setCurrentUser(user);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!currentUser) return;
        setIsLoading(true);

        const dmsRef = ref(db, 'dms');

        const listener = onValue(dmsRef, async (snapshot) => {
            try {
                if (!snapshot.exists()) {
                    setChats([]);
                    return;
                }

                const allDms = snapshot.val();
                const userDms = Object.entries(allDms).filter(([_, chatData]: [string, any]) => 
                    chatData.participants && chatData.participants[currentUser.uid]
                );
                
                const chatPromises = userDms.map(async ([chatId, chatData]) => {
                    const otherUserId = Object.keys(chatData.participants).find(uid => uid !== currentUser.uid);
                    if (!otherUserId) return null;

                    try {
                        const userSnapshot = await get(ref(db, `users/${otherUserId}`));
                        if (!userSnapshot.exists()) return null;
                        const otherUser = userSnapshot.val();
                        
                        const lastMessage = chatData.lastMessage || null;
                        const lastReadTimestamp = chatData.participants[currentUser.uid]?.lastRead || 0;
                        const isUnread = lastMessage && lastMessage.timestamp > lastReadTimestamp && lastMessage.senderId !== currentUser.uid;

                        return {
                            chatId,
                            otherUser: {
                                uid: otherUserId,
                                name: otherUser.name,
                                avatar: otherUser.avatar,
                                status: otherUser.status,
                            },
                            lastMessage,
                            isUnread,
                        };
                    } catch (error) {
                        console.error(`MessagesPage: Error processing chat ${chatId}:`, error);
                        return null;
                    }
                });
                
                const resolvedChats = (await Promise.all(chatPromises))
                    .filter((c): c is ChatListItem => c !== null)
                    .sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));

                setChats(resolvedChats);
            } catch (error) {
                console.error("MessagesPage: Error fetching chats:", error);
                setChats([]);
            } finally {
                setIsLoading(false);
            }
        });

        return () => off(dmsRef, 'value', listener);

    }, [currentUser]);


  return (
    <AppLayout>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header>
          <h1 className="text-4xl font-bold font-headline">Messages</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Your direct conversations will appear here.
          </p>
          <div className="md:hidden absolute top-4 right-4">
            <Link href="/ai-assistant">
              <MessageSquare className="h-8 w-8 text-primary" />
            </Link>
          </div>
        </header>

        <main className="mt-8">
            {isLoading ? (
                <MessagesSkeleton />
            ) : chats.length > 0 ? (
                <div className="space-y-2">
                    {chats.map(chat => (
                        <Link href={`/messages/${chat.chatId}`} key={chat.chatId} className={`block p-4 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer ${chat.isUnread ? 'border border-primary/50' : ''}`}>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <Avatar className="h-14 w-14">
                                        <AvatarImage src={chat.otherUser.avatar} />
                                        <AvatarFallback>{chat.otherUser.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    {chat.otherUser.status?.state === 'online' && (
                                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                                    )}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center justify-between">
                                      <h3 className={cn("font-bold text-lg truncate", chat.isUnread && 'text-primary')}>{chat.otherUser.name}</h3>
                                      {chat.lastMessage?.timestamp && (
                                        <p className="text-xs text-muted-foreground flex-shrink-0 ml-4">
                                          {formatDistanceToNow(new Date(chat.lastMessage.timestamp), { addSuffix: true })}
                                        </p>
                                      )}
                                    </div>
                                    <p className={cn("text-muted-foreground truncate", chat.isUnread && 'font-semibold text-foreground')}>
                                       {chat.lastMessage ? (chat.lastMessage.senderId === currentUser?.uid ? `You: ${chat.lastMessage.text}` : chat.lastMessage.text) : 'No messages yet...'}
                                    </p>
                                </div>
                                {chat.isUnread && <div className="w-3 h-3 rounded-full bg-primary ml-2 flex-shrink-0" />}
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center p-12 flex flex-col items-center rounded-lg">
                    <MessageSquare className="h-16 w-16 text-muted-foreground mb-4"/>
                    <h3 className="text-xl font-semibold">No messages yet</h3>
                    <p className="text-muted-foreground mt-2">
                        When you start a conversation with another user, it will show up here.
                    </p>
                </div>
            )}
        </main>
      </div>
    </AppLayout>
  );
}
