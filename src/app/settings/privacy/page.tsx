
'use client';

import { AppLayout } from '@/components/app-layout';
import { PrivacySettings } from '@/components/privacy-settings';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { ref, onValue, update } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

type PrivacySettingsType = {
  onlineStatusVisibility: 'everyone' | 'following' | 'none';
  interestsVisibility: 'everyone' | 'following' | 'none';
};

function PrivacyPageSkeleton() {
  return (
    <div>
      <header className="mb-8">
        <Skeleton className="h-10 w-1/3 rounded-lg" />
        <Skeleton className="h-6 w-1/2 mt-3 rounded-lg" />
      </header>
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="h-5 w-64 rounded-md" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/3 rounded-md" /> {/* Label */}
            <div className="space-y-2">
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-5 w-24" />
                </div>
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-5 w-32" />
                </div>
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-5 w-16" />
                </div>
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/3 rounded-md" /> {/* Label */}
            <div className="space-y-2">
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-5 w-24" />
                </div>
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-5 w-32" />
                </div>
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-5 w-16" />
                </div>
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/3 rounded-md" /> {/* Label */}
            <Skeleton className="h-5 w-2/3 mt-2 rounded-md" /> {/* Description */}
            <Skeleton className="h-24 w-full rounded-md" /> {/* Blocked Accounts section content, simplified */}
          </div>
          <div className="flex justify-end pt-4">
            <Skeleton className="h-12 w-32 rounded-md" /> {/* Save Changes button */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PrivacyPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettingsType>({
    onlineStatusVisibility: 'everyone',
    interestsVisibility: 'everyone',
  });
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        const settingsRef = ref(db, `users/${user.uid}/privacy`);
        onValue(settingsRef, (snapshot) => {
          if (snapshot.exists()) {
            setPrivacySettings(snapshot.val());
          }
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSaveChanges = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const settingsRef = ref(db, `users/${currentUser.uid}/privacy`);
      await update(settingsRef, privacySettings);
      toast({
        title: 'Success',
        description: 'Your privacy settings have been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to save privacy settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !currentUser) {
    return (
      <AppLayout>
        <PrivacyPageSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="mb-8">
          <h1 className="text-4xl font-bold font-headline">Privacy & Safety</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage who sees your information and how you interact with others.
          </p>
        </header>
        
        <PrivacySettings
          currentSettings={privacySettings}
          onSettingsChange={setPrivacySettings}
          userId={currentUser.uid}
        />

        <div className="mt-6 flex justify-end">
            <Button onClick={handleSaveChanges} disabled={isSaving} size="lg">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
        </div>
      </div>
    </AppLayout>
  );
}
