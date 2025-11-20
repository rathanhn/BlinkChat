'use client';

import { useState, useEffect, useRef, UIEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ArrowLeft, MoreVertical, UserX, MessageSquare, Pencil, Trash2, X, CornerDownLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AnimatePresence, motion } from 'framer-motion';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { ref, set, onValue, get, push, off, serverTimestamp, query, orderByChild, remove, update } from 'firebase/database';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/app/profile/[userId]/page';
import { format } from 'date-fns';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollDirection } from '@/hooks/use-scroll-direction';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AppLayout } from '@/components/app-layout';


type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  isEdited?: boolean;
  replyTo?: {
    messageId: string;
    text: string;
    senderName: string;
  };
};

type OtherUser = UserProfile & {uid: string, status?: { state: string, last_changed: number }};

function ChatPageSkeleton() {
  return (
    <div className="flex flex-col h-full">
        <header className="flex items-center gap-4 p-4 border-b flex-shrink-0">
          <Skeleton className="h-10 w-10 rounded-full" /> {/* Back arrow button */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" /> {/* Other user avatar */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" /> {/* Other user name */}
              <Skeleton className="h-3 w-16" /> {/* Other user status */}
            </div>
          </div>
          <Skeleton className="h-8 w-8 ml-auto rounded-full" /> {/* More options button */}
        </header>
      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="flex items-end gap-2 justify-start">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-12 w-48 rounded-lg" />
        </div>
        <div className="flex items-end gap-2 justify-end">
          <Skeleton className="h-10 w-40 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="flex items-end gap-2 justify-start">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-16 w-64 rounded-lg" />
        </div>
        <div className="flex items-end gap-2 justify-end">
          <Skeleton className="h-12 w-32 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </main>
      <footer className="p-4 border-t flex-shrink-0">
        <div className="relative">
          <Skeleton className="h-12 w-full rounded-full" /> {/* Input field */}
          <Skeleton className="h-9 w-9 rounded-full absolute right-2 top-1/2 -translate-y-1/2" /> {/* Send button */}
        </div>
      </footer>
    </div>
  )
}

export default function DirectMessagePage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.chatId as string;
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Custom layout for mobile messages - no bottom navigation
  if (isMobile) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <div className="flex-1 flex flex-col">
          <DirectMessageContent />
        </div>
      </div>
    );
  }

  // Desktop layout with AppLayout
  return (
    <AppLayout>
      <DirectMessageContent />
    </AppLayout>
  );
}

function DirectMessageContent() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.chatId as string;
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);
  
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  const isMobile = useIsMobile();
  const { isVisible: isFooterVisible } = useScrollDirection({ enableMobileNav: isMobile });


  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const currentScrollY = event.currentTarget.scrollTop;
    // Hide header on scroll down, show on scroll up
    if (currentScrollY > lastScrollY.current && currentScrollY > 50) { 
      setShowHeader(false);
    } else { 
      setShowHeader(true);
    }
    lastScrollY.current = currentScrollY;
  };


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);
      
      const userProfileSnap = await get(ref(db, `users/${user.uid}`));
      if(userProfileSnap.exists()) {
        setCurrentUserProfile(userProfileSnap.val());
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!currentUser || !chatId) return;
    
    const chatRef = ref(db, `dms/${chatId}`);
    const chatListener = onValue(chatRef, async (snapshot) => {
        if (!snapshot.exists()) {
            setIsLoading(false);
            return;
        }

        const chatData = snapshot.val();
        const otherUserId = Object.keys(chatData.participants).find(uid => uid !== currentUser.uid);
        
        if (otherUserId) {
            const userRef = ref(db, `users/${otherUserId}`);
            onValue(userRef, (userSnapshot) => {
                if(userSnapshot.exists()) {
                    setOtherUser({ uid: otherUserId, ...userSnapshot.val() });
                }
            })
        }
        setIsLoading(false);
    });

    const messagesRef = ref(db, `dms/${chatId}/messages`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'));
    const messagesListener = onValue(messagesQuery, (snapshot) => {
        const messagesData: Message[] = [];
        snapshot.forEach(childSnapshot => {
            messagesData.push({ id: childSnapshot.key!, ...childSnapshot.val() });
        });
        setMessages(messagesData);
    });

    let typingListener: any;
    if (otherUser?.uid) {
        const typingRef = ref(db, `dms/${chatId}/typing/${otherUser.uid}`);
        typingListener = onValue(typingRef, (snapshot) => {
            setIsTyping(snapshot.val() === true);
        });
    }

    const lastReadRef = ref(db, `dms/${chatId}/participants/${currentUser.uid}/lastRead`);
    set(lastReadRef, serverTimestamp());

    if(otherUser?.uid){
        const blockRef = ref(db, `blockedUsers/${currentUser.uid}/${otherUser.uid}`);
        const unsubscribeBlock = onValue(blockRef, (snapshot) => {
            setIsBlocked(snapshot.exists());
        });

        return () => {
            off(chatRef, 'value', chatListener);
            off(messagesRef, 'value', messagesListener);
            off(blockRef, 'value', unsubscribeBlock);
            if(typingListener) off(ref(db, `dms/${chatId}/typing/${otherUser.uid}`), 'value', typingListener);
        };
    }

    return () => {
        off(chatRef, 'value', chatListener);
        off(messagesRef, 'value', messagesListener);
        if(typingListener) off(ref(db, `dms/${chatId}/typing/${otherUser?.uid}`), 'value', typingListener);
    };

  }, [currentUser, chatId, otherUser?.uid]);

  useEffect(() => {
    if (editingMessage) {
        setNewMessage(editingMessage.text);
    }
  }, [editingMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
   const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser || !chatId) return;
    setNewMessage(e.target.value);

    const typingRef = ref(db, `dms/${chatId}/typing/${currentUser.uid}`);
    set(typingRef, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      set(typingRef, false);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !currentUser || !chatId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    const typingRef = ref(db, `dms/${chatId}/typing/${currentUser.uid}`);
    set(typingRef, false);
    
    if (editingMessage) {
        // Edit existing message
        const messageRef = ref(db, `dms/${chatId}/messages/${editingMessage.id}`);
        await update(messageRef, {
            text: newMessage,
            isEdited: true,
        });
        setEditingMessage(null);
    } else {
        // Send new message
        const messagesRef = ref(db, `dms/${chatId}/messages`);
        const newMessageRef = push(messagesRef);
        const messagePayload: Partial<Message> = {
            senderId: currentUser.uid,
            text: newMessage,
            timestamp: serverTimestamp()
        };

        if (replyingTo) {
            messagePayload.replyTo = {
                messageId: replyingTo.id,
                text: replyingTo.text,
                senderName: replyingTo.senderId === currentUser.uid ? currentUserProfile!.name : otherUser!.name,
            };
        }
        
        await set(newMessageRef, messagePayload);
        
        await update(ref(db, `dms/${chatId}`), {
            lastMessage: messagePayload,
        });
    }


    setNewMessage('');
    setReplyingTo(null);
  };
  
  const handleStartEdit = (message: Message) => {
    setReplyingTo(null);
    setEditingMessage(message);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setNewMessage('');
  };
  
  const handleStartReply = (message: Message) => {
      setEditingMessage(null);
      setReplyingTo(message);
  };
  
  const handleCancelReply = () => {
      setReplyingTo(null);
  };
  
  const handleDeleteMessage = async (messageId: string) => {
    if (!chatId) return;
    const messageRef = ref(db, `dms/${chatId}/messages/${messageId}`);
    await remove(messageRef);
    toast({ title: "Message Deleted" });
  };

  const handleBlockToggle = async () => {
    if(!currentUser || !otherUser) return;
    const blockRef = ref(db, `blockedUsers/${currentUser.uid}/${otherUser.uid}`);
    if(isBlocked) {
        await remove(blockRef);
        toast({ title: "User Unblocked", description: `You have unblocked ${otherUser.name}.` });
    } else {
        await set(blockRef, true);
        toast({ title: "User Blocked", description: `${otherUser.name} has been blocked.`, variant: 'destructive' });
    }
  };

  if (isLoading || !currentUser || !currentUserProfile) {
    return <ChatPageSkeleton />;
  }
  
  if (!otherUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h2 className="text-2xl font-bold">Chat not found</h2>
        <p className="text-muted-foreground">Could not find the user for this chat.</p>
        <Button asChild className="mt-4"><Link href="/messages">Go to Messages</Link></Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col",
      // Mobile: use full viewport height (no bottom tabs for messages)
      // Desktop: use full viewport height to ensure footer stays at bottom
      "h-screen"
    )}>
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b flex-shrink-0">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" className="rounded-full md:hidden" onClick={() => router.back()}>
            <ArrowLeft />
          </Button>
          <Link href={`/profile/${otherUser.uid}`} className="flex items-center gap-3 hover:bg-muted p-2 rounded-lg transition-colors flex-1">
            <Avatar className="h-12 w-12">
              <AvatarImage src={otherUser.avatar} className="object-cover" data-ai-hint="profile picture" />
              <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="font-bold text-lg">{otherUser.name}</h2>
              <div className="flex items-center gap-2">
                {otherUser.status?.state === 'online' ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <p className="text-sm text-muted-foreground">Online</p>
                  </>
                ) : otherUser.status?.state === 'chatting' ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <p className="text-sm text-muted-foreground">In Chat</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Offline</p>
                )}
                {otherUser.status?.last_changed && (
                  <span className="text-xs text-muted-foreground">
                    • {format(new Date(otherUser.status.last_changed), 'h:mm a')}
                  </span>
                )}
              </div>
            </div>
          </Link>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleBlockToggle} className="text-red-500 focus:text-red-500 focus:bg-red-500/10">
                <UserX className="mr-2 h-4 w-4" />
                {isBlocked ? 'Unblock User' : 'Block User'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </header>
      <main className={cn(
        "flex-1 p-4 space-y-2 overflow-y-auto transition-all duration-300 no-bounce", 
        // Mobile: add bottom padding for fixed input field
        isMobile ? "pb-20" : "",
        // Desktop: no extra padding needed
        "md:pb-0"
      )} onScroll={handleScroll}>
        <AnimatePresence>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4" />
              <h3 className="text-xl font-semibold">Say hello!</h3>
              <p className="mt-2">Start a conversation with {otherUser.name}.</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isCurrentUser = msg.senderId === currentUser.uid;
              const showDateSeparator = index === 0 || !msg.timestamp || !messages[index-1].timestamp || new Date(messages[index-1].timestamp).toDateString() !== new Date(msg.timestamp).toDateString();

              return (
                <div key={msg.id}>
                  {showDateSeparator && msg.timestamp && (
                    <div className="text-center text-xs text-muted-foreground my-4">
                      {format(new Date(msg.timestamp), 'MMMM d, yyyy')}
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className={cn('flex items-end gap-2 group w-full', isCurrentUser ? 'justify-end' : 'justify-start')}
                  >
                    {!isCurrentUser && 
                      <Link href={`/profile/${otherUser.uid}`}>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={otherUser.avatar} className="object-cover" data-ai-hint="profile picture" />
                          <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </Link>
                    }
                    
                    {isCurrentUser && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4"/>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => handleStartReply(msg)}><CornerDownLeft className="mr-2 h-4 w-4"/>Reply</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStartEdit(msg)}><Pencil className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone. This will permanently delete the message.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteMessage(msg.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    <div className={cn(
                      'rounded-lg p-3 max-w-sm sm:max-w-md md:max-w-lg', 
                      isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}>
                      {msg.replyTo && (
                        <div className="p-2 mb-1 border-l-2 border-primary-foreground/50 bg-primary-foreground/20 rounded-md">
                          <p className="font-bold text-xs">{msg.replyTo.senderName}</p>
                          <p className="text-sm truncate">{msg.replyTo.text}</p>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      {msg.timestamp && (
                        <p className={cn(
                          "text-xs mt-1",
                          isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        )}>
                          {msg.isEdited && '(edited) '}
                          {format(new Date(msg.timestamp), 'h:mm a')}
                        </p>
                      )}
                    </div>
                    {isCurrentUser && currentUserProfile &&
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={currentUserProfile.avatar} className="object-cover" data-ai-hint="profile picture" />
                        <AvatarFallback>{currentUserProfile.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    }

                    {!isCurrentUser && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4"/>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStartReply(msg)}><CornerDownLeft className="mr-2 h-4 w-4"/>Reply</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </motion.div>
                </div>
              );
            })
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </main>
      <footer className={cn(
        "p-4 border-t flex-shrink-0", 
        // Mobile: fixed at bottom (no bottom tabs for messages)
        isMobile ? "fixed right-0 left-0 bottom-0 bg-background border-t shadow-lg z-30" : "bg-background",
        // Desktop: normal positioning
        "md:relative md:bg-background md:shadow-none"
      )}>
        {isTyping && (
          <p className="text-xs text-muted-foreground mb-2 ml-2 animate-pulse">
            {otherUser.name} is typing...
          </p>
        )}
        <AnimatePresence>
          {(replyingTo || editingMessage) && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: 10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: 10 }}
              className="p-2 px-4 mb-2 rounded-t-lg bg-muted flex justify-between items-center"
            >
              <div>
                <p className="font-bold text-primary">
                  {editingMessage ? 'Editing Message' : `Replying to ${replyingTo?.senderId === currentUser.uid ? 'Yourself' : otherUser.name}`}
                </p>
                <p className="text-xs text-muted-foreground truncate max-w-xs sm:max-w-sm md:max-w-md">
                  {editingMessage ? editingMessage.text : replyingTo?.text}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={editingMessage ? handleCancelEdit : handleCancelReply}>
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        <form onSubmit={handleSendMessage} className="relative">
          <Input 
            placeholder="Type a message..." 
            className={cn("pr-12 h-12 rounded-full bg-muted", (replyingTo || editingMessage) && "rounded-t-none")} 
            value={newMessage}
            onChange={handleTyping}
            autoFocus={!!(replyingTo || editingMessage)}
          />
          <Button type="submit" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full w-9 h-9">
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </footer>
    </div>
  );
}