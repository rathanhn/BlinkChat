
'use client';

import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, LogOut, Tag, Loader2, UserPlus, UserCheck, MessageSquare, Link as LinkIcon, UserX, Clock, MoreVertical, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { DEFAULT_BANNER_URL } from '@/lib/branding';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { ref, onValue, off, set, remove, serverTimestamp, update, get, push } from 'firebase/database';
import { useRouter, useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';


export type UserProfile = {
  name: string;
  username: string;
  email: string;
  bio: string;
  avatar: string;
  banner: string;
  interests: string[];
  link?: string;
  stats: {
    followers: number;
    following: number;
  };
  status?: {
      state: string;
      last_changed: number;
  },
  privacy?: {
      onlineStatusVisibility: 'everyone' | 'following' | 'none';
      interestsVisibility: 'everyone' | 'following' | 'none';
  }
};

type FollowStatus = 'not_following' | 'following' | 'pending';

type UserListItem = {
    uid: string;
    username: string;
    avatar: string;
    name: string;
}

function UserList({ userIds }: { userIds: string[] }) {
    const [users, setUsers] = useState<UserListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            const userPromises = userIds.map(uid => get(ref(db, `users/${uid}`)));
            const userSnapshots = await Promise.all(userPromises);
            const loadedUsers = userSnapshots.map(snap => ({ uid: snap.key, ...snap.val() } as UserListItem));
            setUsers(loadedUsers.filter(u => u.username));
            setIsLoading(false);
        };
        if(userIds.length > 0) {
            fetchUsers();
        } else {
            setIsLoading(false);
        }
    }, [userIds]);

    if (isLoading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-8">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div>
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-9 w-16 rounded-full ml-auto" />
                </div>
            ))}
        </div>
    );
    if (users.length === 0) return <p className="text-muted-foreground text-center py-16">No users to show.</p>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map(user => (
                <div key={user.uid} className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar>
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <Link href={`/profile/${user.uid}`} className="font-semibold hover:underline">{user.name}</Link>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="ml-auto">
                        <Link href={`/profile/${user.uid}`}>View</Link>
                    </Button>
                </div>
            ))}
        </div>
    );
}

function ProfilePageSkeleton() {
  return (
    <div className="animate-in fade-in">
       <Skeleton className="relative h-48 md:h-64 rounded-2xl" />
        <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-end -mt-20 sm:-mt-24">
                 <Skeleton className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-background" />
                <div className="mt-4 sm:mt-0 sm:ml-auto flex items-center gap-2 w-full sm:w-auto">
                     <Skeleton className="h-10 w-32 rounded-full" />
                     <Skeleton className="h-10 w-32 rounded-full" />
                </div>
            </div>

             <div className="mt-6 space-y-3">
                <Skeleton className="h-8 w-48 rounded-md" />
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-5 w-full max-w-lg rounded-md" />
            </div>

            <div className="mt-6 flex items-center gap-8">
                <div className="text-center space-y-2">
                    <Skeleton className="h-7 w-12 rounded-md" />
                    <Skeleton className="h-4 w-20 rounded-md" />
                </div>
                <div className="text-center space-y-2">
                    <Skeleton className="h-7 w-12 rounded-md" />
                    <Skeleton className="h-4 w-20 rounded-md" />
                </div>
            </div>
            <div className="mt-8">
                <Skeleton className="h-10 w-full rounded-t-lg" />
            </div>
        </div>
    </div>
  )
}

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followStatus, setFollowStatus] = useState<FollowStatus>('not_following');
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [followers, setFollowers] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [currentUserFollowing, setCurrentUserFollowing] = useState<string[]>([]);


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setIsOwnProfile(user.uid === userId);
         const currentUserFollowingRef = ref(db, `following/${user.uid}`);
        const unsubscribeCurrentUserFollowing = onValue(currentUserFollowingRef, (snapshot) => {
          if (snapshot.exists()) {
            setCurrentUserFollowing(Object.keys(snapshot.val()));
          } else {
            setCurrentUserFollowing([]);
          }
        });
        return () => off(currentUserFollowingRef, 'value', unsubscribeCurrentUserFollowing);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [router, userId]);

  useEffect(() => {
    if (!userId) return;
    const userRef = ref(db, 'users/' + userId);
    const unsubscribeProfile = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setProfile({
            ...data,
            stats: {
                followers: data.stats?.followers || 0,
                following: data.stats?.following || 0,
            },
            privacy: {
                onlineStatusVisibility: data.privacy?.onlineStatusVisibility || 'everyone',
                interestsVisibility: data.privacy?.interestsVisibility || 'everyone',
            }
        });
      }
    });
    
    const followersRef = ref(db, `followers/${userId}`);
    const followersListener = onValue(followersRef, snap => setFollowers(snap.exists() ? Object.keys(snap.val()) : []));
    
    const followingRef = ref(db, `following/${userId}`);
    const followingListener = onValue(followingRef, snap => setFollowing(snap.exists() ? Object.keys(snap.val()) : []));

    return () => {
        off(userRef, 'value', unsubscribeProfile);
        off(followersRef, 'value', followersListener);
        off(followingRef, 'value', followingListener);
    }
  }, [userId]);
  
  useEffect(() => {
      if(currentUser && userId) {
          // Check following status
          const followingRef = ref(db, `following/${currentUser.uid}/${userId}`);
          const unsubscribeFollowing = onValue(followingRef, (snapshot) => {
              if (snapshot.exists()) {
                  setFollowStatus('following');
              } else {
                  // If not following, check for a pending request
                  const notificationsRef = ref(db, `notifications/${userId}`);
                  get(notificationsRef).then(snap => {
                      if(snap.exists()){
                          const notifications = snap.val();
                          const pendingRequest = Object.values(notifications).find((n: any) => n.fromUserId === currentUser.uid && n.status === 'pending');
                          setFollowStatus(pendingRequest ? 'pending' : 'not_following');
                      } else {
                          setFollowStatus('not_following');
                      }
                  })
              }
          });

          // Check block status
          const blockRef = ref(db, `blockedUsers/${currentUser.uid}/${userId}`);
          const unsubscribeBlock = onValue(blockRef, (snapshot) => {
            setIsBlocked(snapshot.exists());
          });

          return () => {
            off(followingRef, 'value', unsubscribeFollowing);
            off(blockRef, 'value', unsubscribeBlock);
          }
      }
  }, [currentUser, userId]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };
  
  const handleFollowRequest = async () => {
      if(!currentUser || !profile || !currentUser.displayName || !currentUser.photoURL) return;
      
      const newNotificationRef = push(ref(db, `notifications/${userId}`));

      await set(newNotificationRef, {
          type: 'FOLLOW_REQUEST',
          fromUserId: currentUser.uid,
          fromUsername: currentUser.displayName,
          fromUserAvatar: currentUser.photoURL,
          timestamp: serverTimestamp(),
          status: 'pending'
      });
      
      setFollowStatus('pending');
      toast({ title: 'Request Sent', description: `Your follow request to ${profile.username} has been sent.`});
  }

  const handleUnfollow = async () => {
    if(!currentUser || !profile) return;
    const updates: { [key: string]: any } = {};
    updates[`/following/${currentUser.uid}/${userId}`] = null;
    updates[`/followers/${userId}/${currentUser.uid}`] = null;
    await update(ref(db), updates);
    setFollowStatus('not_following');
    toast({ title: 'Unfollowed', description: `You are no longer following ${profile?.username}.`});
  }
  
  const handleBlockToggle = async () => {
    if(!currentUser || !profile) return;
    const blockRef = ref(db, `blockedUsers/${currentUser.uid}/${userId}`);
    if(isBlocked) {
        await remove(blockRef);
        toast({ title: "User Unblocked", description: `You have unblocked ${profile.username}.` });
    } else {
        await set(blockRef, true);
        await handleUnfollow(); // Force unfollow on block
        toast({ title: "User Blocked", description: `${profile.username} has been blocked.`, variant: 'destructive' });
    }
  }

  const handleCreateOrNavigateToChat = async () => {
    if (!currentUser || !userId) return;
    
    const sortedIds = [currentUser.uid, userId].sort();
    const chatId = sortedIds.join('_');
    const chatRef = ref(db, `dms/${chatId}`);
    
    const chatSnapshot = await get(chatRef);
    if (!chatSnapshot.exists()) {
        const participantData: { [key: string]: any } = {};
        participantData[currentUser.uid] = { exists: true, lastRead: 0 };
        participantData[userId] = { exists: true, lastRead: 0 };

        await set(chatRef, {
            participants: participantData,
            createdAt: serverTimestamp(),
            lastMessage: null,
        });
    }

    router.push(`/messages/${chatId}`);
  };


  if (!profile || !currentUser) {
    return (
      <AppLayout>
        <ProfilePageSkeleton />
      </AppLayout>
    );
  }

  const isDicebearAvatar = profile.avatar?.includes('api.dicebear.com');

  const canViewOnlineStatus =
    isOwnProfile ||
    profile.privacy?.onlineStatusVisibility === 'everyone' ||
    (profile.privacy?.onlineStatusVisibility === 'following' && currentUserFollowing.includes(userId));

  const canViewInterests =
    isOwnProfile ||
    profile.privacy?.interestsVisibility === 'everyone' ||
    (profile.privacy?.interestsVisibility === 'following' && currentUserFollowing.includes(userId));


  const getFollowButton = () => {
      switch (followStatus) {
          case 'following':
              return <Button onClick={handleUnfollow} variant='secondary' className="rounded-full w-full sm:w-auto"><UserCheck className="mr-2 h-4 w-4" /> Following</Button>;
          case 'pending':
              return <Button variant='outline' className="rounded-full w-full sm:w-auto" disabled><Clock className="mr-2 h-4 w-4" /> Pending</Button>;
          case 'not_following':
          default:
              return <Button onClick={handleFollowRequest} className="rounded-full w-full sm:w-auto"><UserPlus className="mr-2 h-4 w-4" /> Follow</Button>;
      }
  }

  return (
    <AppLayout>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden">
           <Image src={profile.banner || DEFAULT_BANNER_URL} data-ai-hint="abstract background" fill sizes="100vw" className="object-cover" alt="Profile banner" priority />
           {isOwnProfile && (
              <Link href="/settings" className="md:hidden absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
                  <Settings className="h-5 w-5" />
              </Link>
            )}
        </div>
        
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end -mt-20 sm:-mt-24">
            <div className="flex-shrink-0 relative">
              <Avatar className={cn(
                "w-32 h-32 md:w-40 md:h-40 border-4 border-background shadow-lg",
                isDicebearAvatar && "bg-muted"
              )}>
                <AvatarImage src={profile.avatar} className="object-cover" data-ai-hint="profile picture" />
                <AvatarFallback>{profile.username.charAt(0)}</AvatarFallback>
              </Avatar>
              {profile.status?.state === 'online' && canViewOnlineStatus && (
                <div className="absolute bottom-4 right-4 w-6 h-6 bg-green-500 rounded-full border-4 border-background" />
              )}
            </div>
            
            <div className="mt-4 sm:mt-0 sm:ml-auto flex items-center gap-2 w-full sm:w-auto">
              {isOwnProfile ? (
                  <>
                  <Button asChild variant="outline" className="rounded-full w-full sm:w-auto">
                    <Link href="/settings/profile">
                      <Settings className="mr-2 h-4 w-4" /> Edit Profile
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={handleLogout} className="rounded-full w-full sm:w-auto">
                     <LogOut className="mr-2 h-4 w-4" /> Logout
                  </Button>
                </>
              ) : (
                  <>
                    {getFollowButton()}
                    <Button onClick={handleCreateOrNavigateToChat} variant="outline" className="rounded-full w-full sm:w-auto">
                          <MessageSquare className="mr-2 h-4 w-4" /> Message
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="rounded-full">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleBlockToggle} className="text-red-500 focus:text-red-500 focus:bg-red-500/10">
                                <UserX className="mr-2 h-4 w-4" />
                                {isBlocked ? 'Unblock User' : 'Block User'}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h1 className="text-3xl font-bold font-headline">{profile.name}</h1>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground">@{profile.username.toLowerCase()}</p>
              {profile.status?.state === 'online' && canViewOnlineStatus && (
                  <div className="flex items-center gap-1.5 text-green-500">
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      <p className="text-xs font-semibold">Online</p>
                  </div>
              )}
            </div>
            <p className="mt-4 max-w-prose">{profile.bio}</p>
            {profile.link && (
              <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                <LinkIcon className="h-4 w-4" />
                <Link href={profile.link.startsWith('http') ? profile.link : `https://${profile.link}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {profile.link}
                </Link>
              </div>
            )}
          </div>
            
          <div className="mt-6 flex items-center gap-8 text-lg">
            <div className="text-center">
              <p className="font-bold text-2xl">{followers.length}</p>
              <p className="text-sm text-muted-foreground">Followers</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-2xl">{following.length}</p>
              <p className="text-sm text-muted-foreground">Following</p>
            </div>
          </div>

          <div className="mt-6">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Tag className="h-5 w-5"/> Interests</h2>
              {canViewInterests ? (
                 <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {profile.interests && profile.interests.length > 0 ? (
                      profile.interests.map(interest => (
                        <Badge key={interest} variant="secondary">{interest}</Badge>
                      ))
                    ) : (
                        <p className="text-muted-foreground text-sm">
                            No interests added yet. {isOwnProfile && "Click 'Edit Profile' to add some!"}
                        </p>
                    )}
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                    <EyeOff className="h-4 w-4" /> This user's interests are private.
                </div>
              )}
          </div>
        </div>
        
        <div className="mt-8">
          <Tabs defaultValue="followers" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4 py-0">
              <TabsTrigger value="followers" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 border-primary data-[state=active]:bg-transparent px-2 py-3 text-base">Followers</TabsTrigger>
              <TabsTrigger value="following" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 border-primary data-[state=active]:bg-transparent px-2 py-3 text-base">Following</TabsTrigger>
            </TabsList>
             <TabsContent value="followers" className="p-6">
                  <h3 className="text-xl font-semibold mb-4">Followers</h3>
                  <UserList userIds={followers} />
            </TabsContent>
             <TabsContent value="following" className="p-6">
                <h3 className="text-xl font-semibold mb-4">Following</h3>
                  <UserList userIds={following} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
