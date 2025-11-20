
'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from './ui/input';
import { Search, Loader2, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { useMessages } from '@/context/message-context';
import Link from 'next/link';
import { useState } from 'react';

export function DMSheet({ children }: { children: React.ReactNode }) {
    const { conversations, isLoading } = useMessages();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredConversations = conversations.filter(convo => 
        convo.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Sheet>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent className="bg-background/95 backdrop-blur-lg border-l-primary/20 p-0 flex flex-col">
            <SheetHeader className="p-6 pb-2">
            <SheetTitle className="text-2xl font-bold font-headline">Messages</SheetTitle>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Search messages..." 
                    className="pl-10 bg-black/30"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            </SheetHeader>
            <ScrollArea className="flex-1">
                <div className="p-6 pt-2 space-y-1">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : filteredConversations.length > 0 ? (
                        filteredConversations.map(convo => (
                            <Link href={`/messages/${convo.chatId}`} key={convo.chatId} className={`flex items-center gap-3 w-full text-left p-2 rounded-lg hover:bg-muted ${convo.isUnread ? 'font-bold' : ''}`}>
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={convo.otherUser.avatar} />
                                    <AvatarFallback>{convo.otherUser.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <h4 className="font-semibold">{convo.otherUser.name}</h4>
                                    <p className="text-sm text-muted-foreground truncate">
                                        {convo.lastMessage ? (convo.lastMessage.senderId === convo.currentUserId ? `You: ${convo.lastMessage.text}` : convo.lastMessage.text) : 'No messages yet...'}
                                    </p>
                                </div>
                                {convo.isUnread && <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />}
                            </Link>
                        ))
                    ) : (
                         <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
                            <MessageSquare className="h-12 w-12 mb-4" />
                            <h3 className="font-semibold">{searchQuery ? 'No results found' : 'No conversations'}</h3>
                            <p className="text-sm">{searchQuery ? 'Try a different name.' : "Start a chat from a user's profile."}</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </SheetContent>
        </Sheet>
    );
}
