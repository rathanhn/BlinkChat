 'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Compass, Bot, ArrowRight } from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/app/profile/[userId]/page';
import { Skeleton } from '@/components/ui/skeleton';

function HomeSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-10 w-2/3 rounded-lg" />
        <Skeleton className="h-6 w-full mt-3 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="p-8 flex flex-col items-start h-full rounded-2xl bg-muted/30">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-8 w-48 mt-4" />
            <Skeleton className="h-6 w-full mt-2" />
            <Skeleton className="h-6 w-3/4 mt-1" />
            <Skeleton className="h-12 w-40 rounded-full mt-8" />
          </div>
        ))}
      </div>
    </div>
  )
}


export default function HomePage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = ref(db, `users/${currentUser.uid}`);
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.val());
          }
          setIsLoading(false);
        });
      } else {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <AppLayout>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header>
          {isLoading ? (
             <HomeSkeleton />
          ) : (
            <>
              <h1 className="text-4xl font-bold font-headline">
                {profile ? `Welcome back, ${profile.name}!` : 'Welcome to BlinkChat!'}
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Ready to connect? Dive into a random chat or get some ideas from our AI.
              </p>
            </>
          )}
        </header>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="group relative p-8 flex flex-col items-start justify-between h-full overflow-hidden rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors duration-300">
            <div>
              <div className="p-4 bg-primary/20 rounded-xl inline-block group-hover:bg-primary/30 transition-colors">
                <Compass className="h-10 w-10 text-primary" />
              </div>
              <h2 className="mt-4 text-3xl font-bold font-headline">Go Random</h2>
              <p className="mt-2 text-muted-foreground text-lg max-w-sm">
                Enter your interests and we'll match you with someone who shares your vibe.
              </p>
            </div>
            <Button asChild size="lg" className="mt-8 !px-8 !py-6 group">
              <Link href="/random-chat">
                Find a Chat <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Compass className="absolute -right-12 -bottom-12 h-48 w-48 text-primary/10 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
          </div>

          <div className="group relative p-8 flex flex-col items-start justify-between h-full overflow-hidden rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors duration-300">
            <div>
              <div className="p-4 bg-accent/20 rounded-xl inline-block group-hover:bg-accent/30 transition-colors">
                <Bot className="h-10 w-10 text-accent" />
              </div>
              <h2 className="mt-4 text-3xl font-bold font-headline">Ask Blink AI</h2>
              <p className="mt-2 text-muted-foreground text-lg max-w-sm">
                Need conversation starters, movie suggestions, or just want to chat? Our AI is here to help.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary" className="mt-8 !px-8 !py-6 group bg-accent/80 hover:bg-accent text-accent-foreground">
              <Link href="/ai-assistant">
                Chat with AI <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
             <Bot className="absolute -right-12 -bottom-12 h-48 w-48 text-accent/10 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}