
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, UserPlus, X, Send, SkipForward, Plus, Search, UserX, Flag } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AnimatePresence, motion } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DEFAULT_BANNER_URL } from '@/lib/branding';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { ref, set, onValue, get, child, serverTimestamp, push, off, remove, update, runTransaction, query, orderByChild, onDisconnect } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollDirection } from '@/hooks/use-scroll-direction';
import { FullscreenSkeletonLoader } from '@/components/ui/fullscreen-skeleton-loader';
import { useToast } from '@/hooks/use-toast';

type ChatState = 'idle' | 'searching' | 'chatting';

type UserProfile = {
  uid: string;
  username: string;
  email: string;
  bio: string;
  avatar: string;
  banner: string;
  interests: string[];
  stats: {
    followers: number;
    following: number;
  };
};

type MatchedUser = UserProfile & { sharedInterests: string[] };

type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
};

function SearchingState({ onCancelSearch }: { onCancelSearch: () => void }) {
  return (
    <div className="flex flex-col justify-center items-center h-full text-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center gap-4 p-6">
          <Loader2 className="h-14 w-14 animate-spin text-primary" />
          <h2 className="text-2xl font-bold font-headline">Finding your match...</h2>
          <p className="text-muted-foreground">We're connecting you based on shared interests.</p>
          <Button onClick={onCancelSearch} variant="outline" className="mt-2">Cancel Search</Button>
        </div>
      </motion.div>
    </div>
  );
}

function UserProfileSheet({ user, currentUser, onEndChat }: { user: MatchedUser, currentUser: FirebaseUser | null, onEndChat: () => void }) {
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!currentUser || !user) return;
    const checkFollowing = async () => {
      const followingRef = ref(db, `following/${currentUser.uid}/${user.uid}`);
      const snapshot = await get(followingRef);
      setIsFollowing(snapshot.exists());
    };
    checkFollowing();
  }, [currentUser, user]);
  
  const handleFollow = async () => {
    if (!currentUser || !user) {
      toast({
        title: "Error",
        description: "Authentication or user data missing.",
        variant: "destructive",
      });
      return;
    }

    const currentUserFollowingUserRef = ref(db, `following/${currentUser.uid}/${user.uid}`);
    const matchedUserFollowedByCurrentUserRef = ref(db, `followers/${user.uid}/${currentUser.uid}`);

    try {
      if (isFollowing) {
        // Unfollow logic
        await runTransaction(ref(db, `users/${currentUser.uid}/stats/following`), (currentFollowing) => {
          return (currentFollowing || 0) - 1;
        });
        await runTransaction(ref(db, `users/${user.uid}/stats/followers`), (currentFollowers) => {
          return (currentFollowers || 0) - 1;
        });
        await remove(currentUserFollowingUserRef);
        await remove(matchedUserFollowedByCurrentUserRef);
        setIsFollowing(false);
        toast({
          title: "Unfollowed",
          description: `You have unfollowed ${user.username}.`,
        });
      } else {
        // Follow logic
        await runTransaction(ref(db, `users/${currentUser.uid}/stats/following`), (currentFollowing) => {
          return (currentFollowing || 0) + 1;
        });
        await runTransaction(ref(db, `users/${user.uid}/stats/followers`), (currentFollowers) => {
          return (currentFollowers || 0) + 1;
        });
        await set(currentUserFollowingUserRef, true);
        await set(matchedUserFollowedByCurrentUserRef, true);
        setIsFollowing(true);
        toast({
          title: "Success",
          description: `You are now following ${user.username}.`,
        });
      }
    } catch (error) {
      console.error("Error following/unfollowing user:", error);
      toast({
        title: "Error",
        description: `Failed to ${isFollowing ? 'unfollow' : 'follow'} ${user.username}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleBlock = async () => {
    if (!currentUser || !user) {
      toast({
        title: "Error",
        description: "Authentication or user data missing.",
        variant: "destructive",
      });
      return;
    }

    const blockedUsersRef = ref(db, `blockedUsers/${currentUser.uid}/${user.uid}`);

    try {
      // Check if already blocked
      const blockedSnapshot = await get(blockedUsersRef);
      if (blockedSnapshot.exists()) {
        toast({
          title: "Already Blocked",
          description: `You have already blocked ${user.username}.`,
        });
        return;
      }

      await set(blockedUsersRef, true);
      toast({
        title: "User Blocked",
        description: `${user.username} has been blocked.`,
        variant: "destructive",
      });
      onEndChat();
    } catch (error) {
      console.error("Error blocking user:", error);
      toast({
        title: "Error",
        description: `Failed to block ${user.username}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleReport = async () => {
    if (!currentUser || !user) {
      toast({
        title: "Error",
        description: "Authentication or user data missing.",
        variant: "destructive",
      });
      return;
    }

    const reportsRef = ref(db, 'reports');
    const newReportRef = push(reportsRef);

    try {
      await set(newReportRef, {
        reporterId: currentUser.uid,
        reportedId: user.uid,
        reason: "User reported during random chat.", // A more detailed reason can be implemented later
        timestamp: serverTimestamp(),
      });
      toast({
        title: "User Reported",
        description: `${user.username} has been reported. The chat will now end.`,
        variant: "destructive",
      });
      onEndChat();
    } catch (error) {
      console.error("Error reporting user:", error);
      toast({
        title: "Error",
        description: `Failed to report ${user.username}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="flex items-center gap-4 text-left w-full hover:bg-muted p-2 rounded-lg transition-colors">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar} className="object-cover" data-ai-hint="profile picture" />
            <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-bold text-lg">{user.username}</h3>
            <div className="flex flex-wrap gap-1 mt-1">
              <span className="text-sm text-muted-foreground mr-1">Matched on:</span>
              {user.sharedInterests.map((interest: string) => (
                <Badge key={interest} variant="secondary">{interest}</Badge>
              ))}
            </div>
          </div>
        </button>
      </SheetTrigger>
      <SheetContent className="bg-background/95 backdrop-blur-lg border-l-primary/20">
        <SheetHeader>
            <div className="relative h-32 -mx-6 -mt-6">
                 <Image src={user.banner || DEFAULT_BANNER_URL} data-ai-hint="abstract background" fill sizes="100vw" className="object-cover opacity-50" alt="Profile banner" />
            </div>
           <div className="flex flex-col items-center text-center -mt-16">
             <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                <AvatarImage src={user.avatar} className="object-cover" data-ai-hint="profile picture" />
                <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
              </Avatar>
              <SheetTitle className="mt-4 text-2xl font-bold font-headline">{user.username}</SheetTitle>
              <p className="text-sm text-muted-foreground">@{user.username.toLowerCase()}</p>
           </div>
        </SheetHeader>
        <div className="mt-6 space-y-6">
            <div className="text-center">
                <p className="text-muted-foreground">{user.bio}</p>
            </div>
             <div className="flex items-center justify-around text-lg text-center bg-muted/50 p-4 rounded-xl">
              <div>
                <p className="font-bold text-2xl">{user.stats.followers}</p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </div>
              <div>
                <p className="font-bold text-2xl">{user.stats.following}</p>
                <p className="text-sm text-muted-foreground">Following</p>
              </div>
            </div>
             <div className="space-y-2">
                <h4 className="font-semibold">Interests</h4>
                <div className="flex flex-wrap gap-2">
                    {user.interests.map((interest: string) => (
                        <Badge key={interest} variant="secondary">{interest}</Badge>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-4 border-t border-border">
                <Button variant="outline" onClick={handleFollow}><UserPlus className="mr-2 h-4 w-4" /> {isFollowing ? 'Following' : 'Follow'}</Button>
                <Button variant="destructive" onClick={handleBlock}><UserX className="mr-2 h-4 w-4" /> Block</Button>
                <Button variant="outline" onClick={handleReport} className="col-span-2"><Flag className="mr-2 h-4 w-4" /> Report User</Button>
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}


function ChattingState({ onEndChat, onSkip, interests, matchedUser, chatId }: { onEndChat: () => void, onSkip: () => void, interests: string[], matchedUser: MatchedUser, chatId: string }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [partnerDisconnected, setPartnerDisconnected] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(true);
  const [isWaitingForPartner, setIsWaitingForPartner] = useState(false);

 const isMobile = useIsMobile();
 const { isVisible: isFooterVisible } = useScrollDirection({ enableMobileNav: isMobile });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
       if (user) {
        const userRef = ref(db, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setCurrentUserProfile({ uid: user.uid, ...snapshot.val() });
          }
        });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!chatId) return;
    const messagesRef = ref(db, `chats/${chatId}/messages`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'));

    const unsubscribe = onValue(messagesQuery, (snapshot) => {
      const messagesData: Message[] = [];
      snapshot.forEach(childSnapshot => {
        messagesData.push({ id: childSnapshot.key!, ...childSnapshot.val() });
      });
      setMessages(messagesData);
    });
    return () => { off(messagesRef, 'value', unsubscribe) };
  }, [chatId]);

  useEffect(() => {
    if (!chatId || !currentUser) return;
    const statusRef = ref(db, `chats/${chatId}/disconnectedBy`);
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const val = snapshot.val();
      if (val && val === matchedUser.uid) {
        setPartnerDisconnected(true);
      } else {
        setPartnerDisconnected(false);
      }
    });
    return () => { off(statusRef, 'value', unsubscribe) };
  }, [chatId, currentUser, matchedUser]);

  useEffect(() => {
    if (!matchedUser) return;
    const partnerOnlineRef = ref(db, `users/${matchedUser.uid}/online`);
    const unsubscribe = onValue(partnerOnlineRef, (snapshot) => {
      setPartnerOnline(snapshot.val() === true);
    });
    return () => { off(partnerOnlineRef, 'value', unsubscribe) };
  }, [matchedUser]);

  // Setup onDisconnect for current user within the chat
  useEffect(() => {
    if (!currentUser || !chatId) return;

    const disconnectedByRef = ref(db, `chats/${chatId}/disconnectedBy`);
    onDisconnect(disconnectedByRef).set(currentUser.uid);

    return () => {
      onDisconnect(disconnectedByRef).cancel();
    };
  }, [currentUser, chatId]);

  useEffect(() => {
    // When partner comes back online, clear the disconnectedBy flag if current user was the one who set it.
    // Or, if any user sets it and the other comes online, it should be cleared.
    if (currentUser && chatId && partnerOnline && partnerDisconnected) {
      const disconnectedByRef = ref(db, `chats/${chatId}/disconnectedBy`);
      set(disconnectedByRef, null); // Clear the disconnectedBy flag
    }
  }, [currentUser, chatId, partnerOnline, partnerDisconnected]);

  useEffect(() => {
    if (partnerOnline && isWaitingForPartner) {
      setIsWaitingForPartner(false); // Reset waiting state when partner comes back online
    }
  }, [partnerOnline, isWaitingForPartner]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !currentUser || !chatId) return;
    
    const messagesRef = ref(db, `chats/${chatId}/messages`);
    const newMessageRef = push(messagesRef);
    await set(newMessageRef, {
      senderId: currentUser.uid,
      text: newMessage,
      timestamp: serverTimestamp()
    });
    setNewMessage('');
  };

  if (!currentUser || !currentUserProfile) return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className={cn(
      "flex flex-col",
      // Mobile: use full viewport height (no bottom tabs when chatting)
      // Desktop: use full viewport height to ensure footer stays at bottom
      "h-screen"
    )}>
       {/* User Profile Header - Only show when matched */}
       <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b flex-shrink-0">
         <div className="flex items-center gap-4 p-4">
           <div className="flex-1">
            <UserProfileSheet user={matchedUser} currentUser={currentUser} onEndChat={onEndChat} />
          </div>
           <div className="flex gap-2">
             <Button size="icon" variant="ghost" className="rounded-full hover:bg-primary/10 text-primary" onClick={onSkip}><SkipForward className="h-5 w-5" /></Button>
             <Button size="icon" variant="ghost" onClick={onEndChat} className="rounded-full hover:bg-destructive/10 text-destructive"><X className="h-5 w-5" /></Button>
           </div>
         </div>
       </header>
               <main className={cn(
          "flex-1 flex flex-col", 
          // Mobile: no extra padding needed since footer is relative
          // Desktop: no extra padding needed
          "pb-0"
        )}>
         {/* Messages container - scrollable */}
         <div className="flex-1 px-4 pt-20 md:pt-4 pb-20 space-y-4 overflow-y-auto transition-all duration-300 no-bounce">
           {partnerDisconnected && !partnerOnline && (
             <div className="rounded-lg border bg-muted/50 p-4 text-center">
               <p className="font-medium">Partner disconnected</p>
               <p className="text-sm text-muted-foreground mt-1">You can exit or wait to reconnect.</p>
               <div className="mt-3 flex justify-center gap-2">
                 <Button variant="outline" size="sm" onClick={onEndChat}>Exit</Button>
                 <Button variant="outline" size="sm" onClick={() => setIsWaitingForPartner(true)}>Wait for Partner</Button>
               </div>
             </div>
           )}
           {partnerDisconnected && !partnerOnline && isWaitingForPartner && (
             <div className="rounded-lg border bg-muted/50 p-4 text-center">
               <p className="font-medium">Waiting for your partner to reconnect...</p>
               <div className="mt-3 flex justify-center gap-2">
                 <Button variant="outline" size="sm" onClick={onEndChat}>Exit</Button>
               </div>
             </div>
           )}
           {messages.map((msg, index) => (
             <div key={msg.id} className={cn('flex items-end gap-2', msg.senderId === currentUser.uid ? 'justify-end' : 'justify-start')}>
              {msg.senderId !== currentUser.uid && <Avatar className="h-8 w-8"><AvatarImage src={matchedUser.avatar} className="object-cover" data-ai-hint="profile picture" /><AvatarFallback>{matchedUser.username.charAt(0)}</AvatarFallback></Avatar>}
              <div className={cn('rounded-lg p-3 max-w-sm sm:max-w-md md:max-w-lg', msg.senderId === currentUser.uid ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
              {msg.senderId === currentUser.uid && <Avatar className="h-8 w-8"><AvatarImage src={currentUserProfile.avatar} className="object-cover" data-ai-hint="profile picture" /><AvatarFallback>{currentUserProfile.username.charAt(0)}</AvatarFallback></Avatar>}
            </div>
           ))}
           <div ref={messagesEndRef} />
         </div>
         
         {/* Input field fixed at bottom */}
         <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background z-40">
           <form onSubmit={handleSendMessage} className="relative">
             <Input 
               placeholder="Type a message..." 
               className="pr-12 h-12 rounded-full bg-muted" 
               value={newMessage}
               onChange={(e) => setNewMessage(e.target.value)}
             />
             <Button type="submit" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full w-9 h-9">
               <Send className="h-5 w-5" />
             </Button>
           </form>
         </div>
       </main>
    </div>
  )
}

export default function RandomChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [state, setState] = useState<ChatState>('idle');
  const [interests, setInterests] = useState<string[]>([]);
  const [currentInterest, setCurrentInterest] = useState('');
  const [matchedUser, setMatchedUser] = useState<MatchedUser | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { isVisible: isFooterVisible } = useScrollDirection({ enableMobileNav: isMobile });
  const [isAuthResolved, setIsAuthResolved] = useState(false); // New state to track auth resolution

  const searchingInterestsRef = useRef<string[]>([]);
  
  const cleanupSearching = useCallback(async (uid: string) => {
    // Clear any active onDisconnect for this user from the searching queues
    searchingInterestsRef.current.forEach(interest => {
      onDisconnect(ref(db, `/searching/${interest}/${uid}`)).cancel();
    });

    if (searchingInterestsRef.current.length > 0) {
      const updates: { [key: string]: any } = {};
      searchingInterestsRef.current.forEach(interest => {
        updates[`/searching/${interest}/${uid}`] = null;
      });
      await update(ref(db), updates);
      searchingInterestsRef.current = [];
    }
  }, []);

  const resetState = useCallback(async () => {
    if (currentUser) {
      await cleanupSearching(currentUser.uid);
      const userStatusRef = ref(db, `users/${currentUser.uid}/status`);
      await set(userStatusRef, { state: 'idle' }); // Set to idle state instead of null
    }
    setState('idle');
    setMatchedUser(null);
    setChatId(null);
  }, [currentUser, cleanupSearching]);
  
  
  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        console.log("Auth: User logged in", user.uid);
        const userRef = ref(db, `users/${user.uid}/interests`);
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setInterests(snapshot.val());
            console.log("Auth: User interests loaded", snapshot.val());
          }
        }, { onlyOnce: true });
        setIsAuthResolved(true); // Mark auth as resolved
      } else {
        console.log("Auth: No user, redirecting to login");
        router.push('/login');
        setIsAuthResolved(true); // Mark auth as resolved even if no user
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Setup Firebase presence (online/offline status)
  useEffect(() => {
    if (!currentUser) return;

    console.log("Presence: Setting up for user", currentUser.uid);
    const userOnlineRef = ref(db, `users/${currentUser.uid}/online`);
    const userStatusRef = ref(db, `users/${currentUser.uid}/status`);

    // Explicitly set user to online when connected
    set(userOnlineRef, true);
    // Set user's status to online initially, but respect existing chat state
    const initialStatusCheck = async () => {
      const statusSnapshot = await get(userStatusRef);
      const currentStatus = statusSnapshot.val();
      if (!currentStatus || (currentStatus.state !== 'chatting' && currentStatus.state !== 'searching')) {
        await set(userStatusRef, { state: 'online', last_changed: serverTimestamp() });
      }
    };
    initialStatusCheck();

    // Set user to offline on disconnect for both online presence and detailed status
    onDisconnect(userOnlineRef).set(false);
    onDisconnect(userStatusRef).set({ state: 'offline', last_changed: serverTimestamp() });

    return () => {
      console.log("Presence: Cleaning up for user", currentUser.uid);
      // Explicitly set offline when component unmounts cleanly
      set(userOnlineRef, false);
      onDisconnect(userOnlineRef).cancel();
      onDisconnect(userStatusRef).cancel(); // Cancel status onDisconnect as well
    };
  }, [currentUser]);

  // Listen for match and status changes on current user
  useEffect(() => {
    let cleanupOnValue: (() => void) | undefined;

    const fetchData = async () => {
      if (!currentUser || !isAuthResolved) {
        console.log("Status Listener: Not proceeding. Current user or auth not resolved.", { currentUser: currentUser?.uid, isAuthResolved });
        return;
      }
      
      console.log("Status Listener: Setting up for user", currentUser.uid);
      const userStatusRef = ref(db, `users/${currentUser.uid}/status`);

      // First, get the current status immediately
      const initialStatusSnapshot = await get(userStatusRef);
      const initialStatus = initialStatusSnapshot.val();
      console.log("Status Listener: Initial status fetched via get", initialStatus);

      // Process initial status to correctly set component state
      if (initialStatus && initialStatus.state === 'chatting' && initialStatus.chatId && initialStatus.matchedWith) {
        console.log("Status Listener: Initial load - User is in chatting state.", initialStatus.chatId);
        // No cleanupSearching here, as it's a fresh load
        const matchedUserSnapshot = await get(ref(db, `users/${initialStatus.matchedWith}`));
        if (matchedUserSnapshot.exists()) {
          const matchedUserProfile = { uid: initialStatus.matchedWith, ...matchedUserSnapshot.val() } as UserProfile;
          const userInterestsSnapshot = await get(ref(db, `users/${currentUser.uid}/interests`));
          const userInterests = userInterestsSnapshot.val() || [];
          const sharedInterests = userInterests.filter((i: string) => matchedUserProfile.interests.includes(i));

          setMatchedUser({ ...matchedUserProfile, sharedInterests });
          setChatId(initialStatus.chatId);
          setState('chatting');
          console.log("Status Listener: Initial load - Set to chatting state with matched user", matchedUserProfile.username, "and chatId", initialStatus.chatId);
          
          // Also clear disconnectedBy if current user was the one who set it (reconnection)
          const disconnectedByRef = ref(db, `chats/${initialStatus.chatId}/disconnectedBy`);
          const disconnectedBySnapshot = await get(disconnectedByRef);
          if (disconnectedBySnapshot.exists() && disconnectedBySnapshot.val() === currentUser.uid) {
            console.log("Status Listener: Initial load - Clearing disconnectedBy flag.");
            await set(disconnectedByRef, null);
          }
        } else {
          console.warn("Status Listener: Initial load - Matched user not found, resetting chat state.");
          await resetState();
        }
      } else if (initialStatus && initialStatus.state === 'searching') {
        console.log("Status Listener: Initial load - User is in searching state.");
        setState('searching');
      } else {
        console.log("Status Listener: Initial load - User is in idle/offline state, setting to idle.");
        setState('idle');
      }
      
      // Then, set up the real-time listener for subsequent changes
      const listener = onValue(userStatusRef, async (snapshot) => {
        const status = snapshot.val();
        console.log("Status Listener: Received status via onValue", status);

        // Only process if the status changes from the initial state, or if it's a different state transition
        // This prevents redundant processing of the initial state already handled by 'get'
        if (
          (status && (!initialStatus || status.state !== initialStatus.state)) || 
          (status && status.state === 'chatting' && initialStatus?.state !== 'chatting')
        ) {
          // Handle immediate connection/reconnection to a chat
          if (status && status.state === 'chatting' && status.chatId && status.matchedWith) {
            console.log("Status Listener: onValue update - User is in chatting state.", status.chatId);
            await cleanupSearching(currentUser.uid);

            const matchedUserSnapshot = await get(ref(db, `users/${status.matchedWith}`));
            if (matchedUserSnapshot.exists()) {
              const matchedUserProfile = { uid: status.matchedWith, ...matchedUserSnapshot.val() } as UserProfile;
              const userInterestsSnapshot = await get(ref(db, `users/${currentUser.uid}/interests`));
              const userInterests = userInterestsSnapshot.val() || [];
              const sharedInterests = userInterests.filter((i: string) => matchedUserProfile.interests.includes(i));
              
              setMatchedUser({ ...matchedUserProfile, sharedInterests });
              setChatId(status.chatId);
              setState('chatting');
              console.log("Status Listener: onValue update - Set to chatting state with matched user", matchedUserProfile.username, "and chatId", status.chatId);

              // Clear disconnectedBy status if current user was the one who set it (indicating reconnection)
              const disconnectedByRef = ref(db, `chats/${status.chatId}/disconnectedBy`);
              const disconnectedBySnapshot = await get(disconnectedByRef);
              if (disconnectedBySnapshot.exists() && disconnectedBySnapshot.val() === currentUser.uid) {
                console.log("Status Listener: onValue update - Clearing disconnectedBy flag.");
                await set(disconnectedByRef, null);
              }
            } else if (status.state === 'chatting' && status.chatId && !matchedUserSnapshot.exists()) {
              console.warn("Status Listener: onValue update - Matched user not found, resetting chat state.");
              await resetState();
            }
          } else if (status && status.state === 'idle') {
            console.log("Status Listener: onValue update - User is in idle state.");
            setState('idle');
            setMatchedUser(null);
            setChatId(null);
          } else if (status && status.state === 'searching') {
            console.log("Status Listener: onValue update - User is in searching state.");
            setState('searching');
            setMatchedUser(null);
            setChatId(null);
          } else if (!status) {
            console.log("Status Listener: onValue update - User status is null, setting to idle.");
            setState('idle');
            setMatchedUser(null);
            setChatId(null);
          }
        }
      });
      cleanupOnValue = () => {
        console.log("Status Listener: Cleaning up for user", currentUser.uid);
        off(userStatusRef, 'value', listener);
      };
    };

    fetchData(); // Call the async function immediately

    return () => {
      if (cleanupOnValue) {
        cleanupOnValue();
      }
    };
  }, [currentUser, isAuthResolved, cleanupSearching, resetState]);
  
  // Cleanup on unmount (keep for ChattingState, but for RandomChatPage it's now handled by onDisconnect)
  useEffect(() => {
    return () => {
      // Keep user status to allow reconnection after reload/network issues
    }
  }, []);


  const handleAddInterest = async () => {
    if (!currentUser) return;
    const newInterest = currentInterest.trim().toLowerCase();
    if (newInterest && !interests.includes(newInterest)) {
      const newInterests = [...interests, newInterest];
      setInterests(newInterests);
      setCurrentInterest('');
      const userInterestsRef = ref(db, `users/${currentUser.uid}/interests`);
      await set(userInterestsRef, newInterests);
    }
  };
  
  const handleRemoveInterest = async (interestToRemove: string) => {
    if (!currentUser) return;
    const newInterests = interests.filter(
      (interest) => interest.toLowerCase() !== interestToRemove.toLowerCase()
    );
    setInterests(newInterests);
    const userInterestsRef = ref(db, `users/${currentUser.uid}/interests`);
    await set(userInterestsRef, newInterests);
  };
  
const findMatch = useCallback(async (uid: string, userInterests: string[]) => {
    let matchFound = false;
    let partnerId: string | null = null;

    const shuffledInterests = [...userInterests].sort(() => 0.5 - Math.random());

    for (const interest of shuffledInterests) {
      if (matchFound) break;
      const interestQueueRef = ref(db, `searching/${interest}`);
      
      try {
        const result = await runTransaction(interestQueueRef, (queue) => {
          if (!queue) {
            return { [uid]: true };
          }
          
          let potentialPartnerId: string | null = null;
          for (const id in queue) {
            if (id !== uid) {
              potentialPartnerId = id;
              break;
            }
          }

          if (potentialPartnerId) {
            partnerId = potentialPartnerId;
            delete queue[partnerId]; 
            return queue;
          } else {
            queue[uid] = true;
            return queue;
          }
        });

        if (result.committed && partnerId) {
          matchFound = true;
          const newChatId = push(child(ref(db), 'chats')).key;
          if (!newChatId) continue;

          // Cleanup both users from ALL their searching queues
          const allUpdates: { [key: string]: any } = {};

          const partnerInterestsSnapshot = await get(ref(db, `users/${partnerId}/interests`));
          const partnerInterests = partnerInterestsSnapshot.val() || [];
          
          searchingInterestsRef.current.forEach(i => { allUpdates[`/searching/${i}/${uid}`] = null; });
          partnerInterests.forEach((i: string) => { allUpdates[`/searching/${i}/${partnerId!}`] = null; });

          allUpdates[`/chats/${newChatId}/participants`] = { [uid]: true, [partnerId]: true };
          allUpdates[`/chats/${newChatId}/createdAt`] = serverTimestamp();
          
          const statusPayload = { state: 'chatting', chatId: newChatId };
          allUpdates[`/users/${uid}/status`] = { ...statusPayload, matchedWith: partnerId };
          allUpdates[`/users/${partnerId}/status`] = { ...statusPayload, matchedWith: uid };
          
          await update(ref(db), allUpdates);
          break;
        } else {
            partnerId = null; 
        }
      } catch (error) {
        console.error(`Transaction failed for interest ${interest}:`, error);
      }
    }
  }, []);

  const handleStartSearch = async () => {
    if (interests.length > 0 && currentUser) {
      console.log("handleStartSearch: Initiating search.");
      setState('searching');
      const userRef = ref(db, `users/${currentUser.uid}`);
      // Set user status to searching
      await update(userRef, { interests: interests, status: { state: 'searching' } });
      
      searchingInterestsRef.current = interests;

      // Set onDisconnect for each searching interest
      interests.forEach(interest => {
        onDisconnect(ref(db, `/searching/${interest}/${currentUser.uid}`)).set(null);
      });

      await findMatch(currentUser.uid, interests);
    } else {
      console.log("handleStartSearch: Cannot start search. Interests empty or no current user.");
    }
  };

  const handleCancelSearch = async () => {
    console.log("handleCancelSearch: Cancelling search.");
    await resetState();
  }

  const handleEndChat = async () => {
    console.log("handleEndChat: Ending chat.");
    await resetState();
  }

  const handleSkip = async () => {
      console.log("handleSkip: Skipping chat.");
      if (currentUser && chatId) {
        console.log("handleSkip: Updating disconnectedBy and user status.");
        await update(ref(db), { [`/chats/${chatId}/disconnectedBy`]: currentUser.uid });
        await update(ref(db, `users/${currentUser.uid}/status`), { chatId: null, matchedWith: null });
      }
      await resetState();
      setTimeout(() => handleStartSearch(), 100);
  }


  const isSearching = state === 'searching';

  if (!isAuthResolved) {
    return <FullscreenSkeletonLoader />;
  }

  // Custom layout for chatting - no bottom tabs
  if (state === 'chatting' && matchedUser && chatId) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <ChattingState onEndChat={handleEndChat} onSkip={handleSkip} interests={interests} matchedUser={matchedUser} chatId={chatId}/>
      </div>
    );
  }

  // Normal layout with AppLayout for non-chatting states
  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {state !== 'chatting' && (
           <header className="hidden md:block"> {/* Hide on mobile, as MobileHeader now handles global title */}
            <h1 className="text-4xl font-bold font-headline">Go Random</h1>
            <p className="text-muted-foreground mt-2 text-lg">Find someone new to talk to.</p>
          </header>
        )}
        
        {state !== 'chatting' && (
                                   <div className={cn(
            "flex-1 flex flex-col min-h-0",
            // Mobile: add bottom padding to account for fixed footer
            isMobile && state !== 'chatting' ? "pb-52" : ""
          )}>
            <AnimatePresence mode="wait">
             <motion.div
                 key={state}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
                 transition={{ duration: 0.3 }}
                 className="w-full h-full flex flex-col"
               >
              {state === 'idle' && (
                <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-4">
                  <h2 className="text-2xl font-bold font-headline">Add or confirm your interests</h2>
                  <p className="text-muted-foreground mt-2">We've pre-filled your saved interests. Update them if you like.</p>
                </div>
              )}
              {state === 'searching' && <SearchingState onCancelSearch={handleCancelSearch} />}
            </motion.div>
          </AnimatePresence>
        </div>
        )}

                 <AnimatePresence>
           {state !== 'chatting' && (
                             <motion.footer
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0.0, 0.2, 1] }}
               className={cn(
                 "py-4 flex flex-col gap-2 w-full flex-shrink-0",
                 // Mobile: fixed positioning at bottom
                 "md:relative md:pb-4 md:py-6",
                 isMobile ? "fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border/50 shadow-lg z-40" : "",
                 isMobile && isFooterVisible ? "bottom-20" : isMobile ? "bottom-0" : ""
               )}
             >
              {!isSearching && (
              <div className={cn("p-4 rounded-lg bg-muted/50 transition-opacity duration-300")}>
                <div className="flex flex-wrap gap-2 mb-4 min-h-[28px]">
                  <AnimatePresence>
                    {interests.map(interest => (
                      <motion.div
                        key={interest}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                        transition={{ duration: 0.2, type: "spring", stiffness: 200, damping: 20 }}
                        layout
                      >
                        <Badge variant="secondary" className="text-lg py-1 px-3">
                          {interest}
                          <button onClick={() => handleRemoveInterest(interest)} className="ml-2 rounded-full hover:bg-black/20 p-0.5" disabled={isSearching}>
                            <X className="h-4 w-4" />
                          </button>
                        </Badge>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="relative">
                    <Input
                      id="interests"
                      value={currentInterest}
                      onChange={(e) => setCurrentInterest(e.target.value)}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddInterest();
                          }
                      }}
                      placeholder="e.g. gaming, cooking, jazz..."
                      className="h-12 text-lg bg-background pr-12"
                    />
                      <Button size="icon" variant="ghost" onClick={handleAddInterest} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full w-9 h-9">
                      <Plus className="h-5 w-5" />
                    </Button>
                </div>
              </div>
              )}
              <Button 
                size="lg" 
                onClick={isSearching ? handleCancelSearch : handleStartSearch} 
                disabled={interests.length === 0 && !isSearching} 
                className="h-12 w-full"
                variant={isSearching ? 'destructive' : 'default'}
              >
                {isSearching ? <X className="mr-2 h-5 w-5" /> : <Search className="mr-2 h-5 w-5" />}
                {isSearching ? 'Cancel Search' : 'Find Match'}
              </Button>
            </motion.footer>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
