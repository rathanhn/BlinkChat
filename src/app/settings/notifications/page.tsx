'use client';

import { AppLayout } from '@/components/app-layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell, MessageSquare, UserPlus, Settings } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { ref, onValue, set, off } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';

type NotificationSettings = {
  followRequests: boolean;
  followAccepted: boolean;
  newMessages: boolean;
  randomChatMatches: boolean;
  emailNotifications: boolean;
};

export default function NotificationSettingsPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>({
    followRequests: true,
    followAccepted: true,
    newMessages: true,
    randomChatMatches: true,
    emailNotifications: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // Load user's notification settings
        const settingsRef = ref(db, `users/${user.uid}/notificationSettings`);
        const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
          if (snapshot.exists()) {
            setSettings({ ...settings, ...snapshot.val() });
          }
          setIsLoading(false);
        });

        return () => off(settingsRef, 'value', unsubscribeSettings);
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSettingChange = async (key: keyof NotificationSettings, value: boolean) => {
    if (!currentUser) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      const settingsRef = ref(db, `users/${currentUser.uid}/notificationSettings`);
      await set(settingsRef, newSettings);
      toast({
        title: "Settings Updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
      // Revert the change
      setSettings(settings);
    }
  };

  const handleResetToDefaults = async () => {
    if (!currentUser) return;

    const defaultSettings: NotificationSettings = {
      followRequests: true,
      followAccepted: true,
      newMessages: true,
      randomChatMatches: true,
      emailNotifications: false,
    };

    setSettings(defaultSettings);

    try {
      const settingsRef = ref(db, `users/${currentUser.uid}/notificationSettings`);
      await set(settingsRef, defaultSettings);
      toast({
        title: "Settings Reset",
        description: "Your notification preferences have been reset to defaults.",
      });
    } catch (error) {
      console.error('Error resetting notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to reset settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-4">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
            <div className="space-y-4 mt-8">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/settings">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-4xl font-bold font-headline">Notification Settings</h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Control how you receive notifications from BlinkChat.
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Push Notifications
              </CardTitle>
              <CardDescription>
                Manage in-app notifications for different activities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="follow-requests" className="text-base">
                    Follow Requests
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when someone wants to follow you.
                  </p>
                </div>
                <Switch
                  id="follow-requests"
                  checked={settings.followRequests}
                  onCheckedChange={(checked) => handleSettingChange('followRequests', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="follow-accepted" className="text-base">
                    Follow Accepted
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when someone accepts your follow request.
                  </p>
                </div>
                <Switch
                  id="follow-accepted"
                  checked={settings.followAccepted}
                  onCheckedChange={(checked) => handleSettingChange('followAccepted', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="new-messages" className="text-base">
                    New Messages
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when you receive new direct messages.
                  </p>
                </div>
                <Switch
                  id="new-messages"
                  checked={settings.newMessages}
                  onCheckedChange={(checked) => handleSettingChange('newMessages', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="random-matches" className="text-base">
                    Random Chat Matches
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when you find a match in random chat.
                  </p>
                </div>
                <Switch
                  id="random-matches"
                  checked={settings.randomChatMatches}
                  onCheckedChange={(checked) => handleSettingChange('randomChatMatches', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Manage email notifications (coming soon).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications" className="text-base">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email (feature coming soon).
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                  disabled
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center pt-4">
            <Button variant="outline" onClick={handleResetToDefaults}>
              Reset to Defaults
            </Button>
            <Button asChild>
              <Link href="/notifications">
                <MessageSquare className="mr-2 h-4 w-4" />
                View Notifications
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
