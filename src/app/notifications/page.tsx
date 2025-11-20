
'use client';

import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, UserCheck, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { ref, onValue, off, update, serverTimestamp, push } from 'firebase/database';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

type Notification = {
  id: string;
  type: 'FOLLOW_REQUEST' | 'FOLLOW_ACCEPTED';
  fromUserId: string;
  fromUsername: string;
  fromUserAvatar: string;
  timestamp: number;
  status: 'pending' | 'confirmed';
};

function NotificationItemSkeleton() {
    return (
        <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-48 rounded-md" />
                    <Skeleton className="h-3 w-40 rounded-md" />
                </div>
            </div>
            <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
            </div>
        </div>
    )
}

function RecentActivitySkeleton() {
    return (
        <div className="space-y-4 p-4">
            {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-64 rounded-md" />
                </div>
            ))}
        </div>
    );
}

function NotificationItem({
  notification,
  isFollowingBack,
  onAction,
  onFollowBack,
}: {
  notification: Notification;
  isFollowingBack: boolean;
  onAction: (notificationId: string, action: 'accept' | 'decline') => void;
  onFollowBack: (userId: string, username: string) => void;
}) {
  const showFollowBack = notification.status === 'confirmed' && !isFollowingBack;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
        <div className="flex items-center gap-3">
            <Link href={`/profile/${notification.fromUserId}`}>
                <Avatar>
                    <AvatarImage src={notification.fromUserAvatar} />
                    <AvatarFallback>{notification.fromUsername.charAt(0)}</AvatarFallback>
                </Avatar>
            </Link>
            <div>
                 <p>
                    <Link href={`/profile/${notification.fromUserId}`} className="font-semibold hover:underline">{notification.fromUsername}</Link> wants to connect.
                </p>
                {showFollowBack && (
                     <p className="text-sm text-muted-foreground">You accepted the request.</p>
                )}
            </div>
        </div>
        {notification.status === 'pending' && (
            <div className="flex gap-2">
                <Button size="sm" onClick={() => onAction(notification.id, 'accept')}>Accept</Button>
                <Button size="sm" variant="outline" onClick={() => onAction(notification.id, 'decline')}>Decline</Button>
            </div>
        )}
        {showFollowBack && (
             <Button size="sm" variant="secondary" onClick={() => onFollowBack(notification.fromUserId, notification.fromUsername)}>
                <UserPlus className="mr-2 h-4 w-4"/> Follow Back
            </Button>
        )}
    </div>
  );
}

export default function NotificationsPage() {
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [following, setFollowing] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if(user) {
                setIsLoading(true);
                const notificationsRef = ref(db, `notifications/${user.uid}`);
                const notificationsListener = onValue(notificationsRef, (snapshot) => {
                    const data = snapshot.val();
                    const loadedNotifications: Notification[] = [];
                    if (data) {
                        Object.keys(data).forEach(key => {
                            loadedNotifications.push({ id: key, ...data[key] });
                        });
                    }
                    // Sort by timestamp descending
                    setNotifications(loadedNotifications.sort((a,b) => b.timestamp - a.timestamp));
                    setIsLoading(false);
                });

                const followingRef = ref(db, `following/${user.uid}`);
                const followingListener = onValue(followingRef, (snapshot) => {
                    if (snapshot.exists()) {
                        setFollowing(Object.keys(snapshot.val()));
                    } else {
                        setFollowing([]);
                    }
                });


                return () => {
                    off(notificationsRef, 'value', notificationsListener);
                    off(followingRef, 'value', followingListener);
                }
            } else {
                setIsLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleNotificationAction = async (notificationId: string, action: 'accept' | 'decline') => {
        if (!currentUser || !currentUser.displayName || !currentUser.photoURL) return;

        const notification = notifications.find(n => n.id === notificationId);
        if (!notification) return;

        const updates: { [key: string]: any } = {};
        
        if (action === 'accept') {
            updates[`/notifications/${currentUser.uid}/${notificationId}/status`] = 'confirmed';
            updates[`/following/${notification.fromUserId}/${currentUser.uid}`] = true;
            updates[`/followers/${currentUser.uid}/${notification.fromUserId}`] = true;
            
            // Send a notification back to the requester
            const newNotificationRef = push(ref(db, `notifications/${notification.fromUserId}`));
            
            updates[`/notifications/${notification.fromUserId}/${newNotificationRef.key}`] = {
                type: 'FOLLOW_ACCEPTED',
                fromUserId: currentUser.uid,
                fromUsername: currentUser.displayName,
                fromUserAvatar: currentUser.photoURL,
                timestamp: serverTimestamp(),
                status: 'confirmed'
            };

        } else { // decline
            updates[`/notifications/${currentUser.uid}/${notificationId}`] = null;
        }
        
        await update(ref(db), updates);
    };

    const handleFollowBack = async (userId: string, username: string) => {
        if (!currentUser) return;
        const updates: { [key: string]: any } = {};
        updates[`/following/${currentUser.uid}/${userId}`] = true;
        updates[`/followers/${userId}/${currentUser.uid}`] = true;
        await update(ref(db), updates);
    }


    const pendingRequests = notifications.filter(n => n.type === 'FOLLOW_REQUEST');
    const confirmedActivity = notifications.filter(n => n.type === 'FOLLOW_ACCEPTED');

  return (
    <AppLayout>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header>
          <h1 className="text-4xl font-bold font-headline">Notifications</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage your connection requests and other updates.
          </p>
        </header>

        <main className="mt-8">
            <Tabs defaultValue="requests">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="requests" className="px-2 py-1.5 text-sm">Connection Requests</TabsTrigger>
                    <TabsTrigger value="activity" className="px-2 py-1.5 text-sm">Recent Activity</TabsTrigger>
                </TabsList>
                <TabsContent value="requests" className="mt-4">
                     <div className="space-y-2">
                        {isLoading ? (
                            <div className="space-y-4">
                                <NotificationItemSkeleton />
                                <NotificationItemSkeleton />
                            </div>
                        ) : pendingRequests.length > 0 ? (
                            pendingRequests.map(req => <NotificationItem 
                                key={req.id} 
                                notification={req} 
                                isFollowingBack={following.includes(req.fromUserId)}
                                onAction={handleNotificationAction}
                                onFollowBack={handleFollowBack}
                                    />)
                        ) : (
                            <p className="text-muted-foreground text-center p-8">No new connection requests.</p>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="activity" className="mt-4">
                    <div className="space-y-2">
                        {isLoading ? (
                            <RecentActivitySkeleton />
                        ) : confirmedActivity.length > 0 ? (
                            confirmedActivity.map(req => (
                                <div key={req.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50">
                                    <Check className="h-5 w-5 text-green-500" />
                                    <Link href={`/profile/${req.fromUserId}`}>
                                        <Avatar>
                                            <AvatarImage src={req.fromUserAvatar} />
                                            <AvatarFallback>{req.fromUsername.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    </Link>
                                    <p><Link href={`/profile/${req.fromUserId}`} className="font-semibold hover:underline">{req.fromUsername}</Link> accepted your follow request.</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-center p-8">No new activity to show.</p>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </main>
      </div>
    </AppLayout>
  );
}
