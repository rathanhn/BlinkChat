
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { onValue, ref, off, remove, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import Link from 'next/link';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type PrivacySettingsType = {
  onlineStatusVisibility: 'everyone' | 'following' | 'none';
  interestsVisibility: 'everyone' | 'following' | 'none';
};

type BlockedUser = {
  uid: string;
  name: string;
  username: string;
  avatar: string;
};

export function PrivacySettings({
  currentSettings,
  onSettingsChange,
  userId,
}: {
  currentSettings: PrivacySettingsType;
  onSettingsChange: (newSettings: PrivacySettingsType) => void;
  userId: string;
}) {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;
    const blockedRef = ref(db, `blockedUsers/${userId}`);
    const listener = onValue(blockedRef, async (snapshot) => {
      if (snapshot.exists()) {
        const blockedIds = Object.keys(snapshot.val());
        const userPromises = blockedIds.map((id) => get(ref(db, `users/${id}`)));
        const userSnapshots = await Promise.all(userPromises);
        const users = userSnapshots.map(snap => ({ uid: snap.key, ...snap.val() } as BlockedUser));
        setBlockedUsers(users.filter(u => u.name)); // Filter out users that might not exist anymore
      } else {
        setBlockedUsers([]);
      }
      setIsLoading(false);
    });

    return () => off(blockedRef, 'value', listener);
  }, [userId]);

  const handleUnblock = async (blockedUserId: string) => {
    const unblockRef = ref(db, `blockedUsers/${userId}/${blockedUserId}`);
    await remove(unblockRef);
    toast({ title: 'User Unblocked', description: 'They can now interact with you again.' });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy & Safety</CardTitle>
        <CardDescription>Control who can see your activity and content.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
            <Label className="font-semibold">Who can see your online status?</Label>
            <RadioGroup
                value={currentSettings.onlineStatusVisibility}
                onValueChange={(value) => onSettingsChange({ ...currentSettings, onlineStatusVisibility: value as any })}
                className="space-y-1"
            >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="everyone" id="online-everyone" />
                    <Label htmlFor="online-everyone" className="font-normal">Everyone</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="following" id="online-following" />
                    <Label htmlFor="online-following" className="font-normal">People you follow</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="online-none" />
                    <Label htmlFor="online-none" className="font-normal">No one</Label>
                </div>
            </RadioGroup>
        </div>
        <Separator />
         <div className="space-y-4">
            <Label className="font-semibold">Who can see your interests?</Label>
            <RadioGroup
                value={currentSettings.interestsVisibility}
                onValueChange={(value) => onSettingsChange({ ...currentSettings, interestsVisibility: value as any })}
                className="space-y-1"
            >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="everyone" id="interests-everyone" />
                    <Label htmlFor="interests-everyone" className="font-normal">Everyone</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="following" id="interests-following" />
                    <Label htmlFor="interests-following" className="font-normal">People you follow</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="interests-none" />
                    <Label htmlFor="interests-none" className="font-normal">No one</Label>
                </div>
            </RadioGroup>
        </div>
        <Separator />
        <div className="space-y-4">
            <Label className="font-semibold">Blocked Accounts</Label>
            <CardDescription>Users you have blocked will appear here.</CardDescription>
             <div className="space-y-2 pt-2">
                {isLoading ? (
                    <div className="flex items-center justify-between p-2 rounded-md">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </div>
                        <Skeleton className="h-8 w-20 rounded-md" />
                    </div>
                ) : blockedUsers.length > 0 ? (
                    blockedUsers.map(user => (
                        <div key={user.uid} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                            <Link href={`/profile/${user.uid}`} className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={user.avatar} />
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{user.name}</p>
                                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                                </div>
                            </Link>
                            <Button variant="outline" size="sm" onClick={() => handleUnblock(user.uid)}>Unblock</Button>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground pt-2">You haven't blocked anyone.</p>
                )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
