
'use client';

import { AppLayout } from '@/components/app-layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ChevronRight, User, Shield, Bell } from 'lucide-react';
import Link from 'next/link';

const settingsItems = [
    {
        href: '/settings/profile',
        icon: <User className="h-6 w-6 text-primary" />,
        title: 'Edit Profile',
        description: 'Update your name, username, bio, and profile images.'
    },
    {
        href: '/settings/privacy',
        icon: <Shield className="h-6 w-6 text-primary" />,
        title: 'Privacy and Safety',
        description: 'Control your online status visibility and manage blocked users.'
    },
    {
        href: '/settings/notifications',
        icon: <Bell className="h-6 w-6 text-primary" />,
        title: 'Notifications',
        description: 'Manage how you receive notifications from the app.'
    }
]

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="mb-8">
            <h1 className="text-4xl font-bold font-headline">Settings</h1>
            <p className="text-muted-foreground mt-2 text-lg">
                Manage your account and preferences.
            </p>
        </header>

        <div className="space-y-4">
            {settingsItems.map((item) => (
                <Link href={item.href} key={item.href} className="block">
                    <Card className="hover:border-primary/50 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-lg">
                                    {item.icon}
                                </div>
                                <div>
                                    <CardTitle className="text-xl">{item.title}</CardTitle>
                                    <CardDescription>{item.description}</CardDescription>
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </CardHeader>
                    </Card>
                </Link>
            ))}
        </div>
      </div>
    </AppLayout>
  );
}
