
'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { getMovieSuggestions, getChatTopics, getStressTips, getChatResponse } from './ai-assistant/actions';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Bot, Send, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollDirection } from '@/hooks/use-scroll-direction';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type Suggestion = {
  title: string;
  prompt: string;
  flow: 'movies' | 'topics' | 'stress' | 'general';
  icon: ReactNode;
};

export function AIChatClient({ suggestions }: { suggestions: Suggestion[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { isVisible: isFooterVisible } = useScrollDirection({ enableMobileNav: isMobile });
  

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  useEffect(() => {
    if (!isLoading && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [isLoading]); // Trigger scroll when loading finishes

  const handleSuggestionClick = (suggestion: Suggestion) => {
    handleSendMessage(suggestion.prompt, suggestion.flow);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      handleSendMessage(input, 'general');
      setInput('');
    }
  };
  
  const handleSendMessage = async (prompt: string, flow: 'movies' | 'topics' | 'stress' | 'general') => {
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      let response = '';
      if (flow === 'movies') {
        const result = await getMovieSuggestions({ interests: prompt });
        response = result.movieSuggestions;
      } else if (flow === 'topics') {
        const result = await getChatTopics({ interests: prompt });
        response = result.topics.map(t => `- ${t}`).join('\n');
      } else if (flow === 'stress') {
        const result = await getStressTips({ query: prompt });
        response = result.tips;
      } else if (flow === 'general') {
        const result = await getChatResponse({ query: prompt });
        response = result.response;
      }
      
      const assistantMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Sorry, I ran into an error. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-3">
           <Avatar className="w-10 h-10 bg-gradient-to-br from-primary to-accent text-white">
              <AvatarFallback><Bot className="h-6 w-6" /></AvatarFallback>
            </Avatar>
            <div>
                <h2 className="font-bold text-lg">Blink AI</h2>
                <p className="text-sm text-muted-foreground">Online</p>
            </div>
        </div>
      </header>

      <main className={cn(
        "flex-1 overflow-y-auto transition-all duration-300 no-bounce", 
        // Mobile: dynamic padding based on footer visibility
        isMobile && isFooterVisible ? "pb-44" : isMobile ? "pb-24" : "",
        // Desktop: no extra padding needed
        "md:pb-0"
      )} ref={scrollAreaRef}>
        <div className="space-y-6 p-4">
          {messages.length === 0 ? (
             <div className="text-center text-muted-foreground py-8">
                <h2 className="text-xl font-bold font-headline">Ask me anything</h2>
                <p>Or, try one of the suggestions below to get started.</p>
              </div>
          ) : (
            messages.map((message) => (
              <motion.div 
                key={message.id} 
                className={cn('flex items-start gap-3', message.role === 'user' && 'justify-end')}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {message.role === 'assistant' && (
                  <Avatar className="w-8 h-8 bg-gradient-to-br from-primary to-accent text-white">
                    <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                  </Avatar>
                )}
                <div className={cn('p-3 rounded-lg max-w-md whitespace-pre-wrap', 
                  message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                  {message.content}
                </div>
                {message.role === 'user' && (
                  <Avatar className="w-8 h-8">
                     <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                  </Avatar>
                )}
              </motion.div>
            ))
          )}
          {isLoading && (
             <div className='flex items-start gap-3'>
                <Avatar className="w-8 h-8 bg-gradient-to-br from-primary to-accent text-white">
                    <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                  </Avatar>
                <div className="p-3 bg-muted rounded-lg">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            </div>
          )}
        </div>
      </main>
      
      <footer className={cn(
        "p-4 border-t flex-shrink-0", 
        // Mobile: fixed positioning with dynamic bottom
        isMobile ? "fixed right-0 left-0 bg-background/95 backdrop-blur-lg transition-all duration-300 ease-out shadow-lg" : "",
        isMobile && isFooterVisible ? "bottom-20" : isMobile ? "bottom-0" : "",
        // Desktop: normal positioning
        "md:relative md:bg-transparent md:shadow-none"
      )}>
        {messages.length === 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {suggestions.map(s => (
                <button
                  key={s.title}
                  className="flex items-center gap-3 bg-muted p-3 rounded-lg hover:bg-muted/80 transition-colors w-full md:w-auto md:max-w-xs text-left"
                  onClick={() => handleSuggestionClick(s as Suggestion)}
                >
                  <div className="p-2 bg-background rounded-lg">{s.icon}</div>
                  <span>{s.title}</span>
                </button>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmit} className="relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={messages.length > 0 ? "Ask a follow up question..." : "Type your message..."}
            className="h-12 pr-12 rounded-full bg-muted"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full w-9 h-9" disabled={isLoading}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </footer>
    </div>
  );
}
