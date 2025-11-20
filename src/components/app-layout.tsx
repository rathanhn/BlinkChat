
'use client';

import { Navigation } from "@/components/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Home, Search, Compass, User, Bell, MessageSquare, MessageCircle, Bot, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { SidebarProvider, useSidebar } from "@/context/sidebar-context";
import { NotificationProvider, useNotifications } from "@/context/notification-context";
import { MessageProvider, useMessages } from "@/context/message-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "./ui/skeleton";
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { ref, onValue, set, serverTimestamp, onDisconnect, off, get } from 'firebase/database';
import { motion } from 'framer-motion';
import { FullscreenSkeletonLoader } from '@/components/ui/fullscreen-skeleton-loader';
import { PresenceManager } from '@/components/presence-manager';


function NotificationBell() {
  const { pendingCount } = useNotifications();

  return (
    <Button asChild variant="ghost" size="icon" className="rounded-full relative">
       <Link href="/notifications">
        <Bell className="h-6 w-6" />
        {pendingCount > 0 && (
          <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold ring-2 ring-background leading-tight text-center pt-px">
            {pendingCount}
          </span>
        )}
      </Link>
    </Button>
  );
}

function MobileHeader() {
  const pathname = usePathname();
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-lg border-b border-border/50 z-40 flex items-center justify-between px-4">
       <Link href="/home" className="flex items-center gap-2">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-accent">
              <MessageCircle className="h-6 w-6 text-white" />
          </div>
            <span className="text-lg font-bold">BlinkChat</span>
      </Link>
      <div className="flex items-center gap-2">
        {pathname !== '/notifications' && <NotificationBell />} {/* Only show if not on notifications page */}
        {pathname === '/messages' && <Link href="/ai-assistant"><Button variant="ghost" size="icon" className="rounded-full"><Bot className="h-6 w-6" /></Button></Link>} {/* AI button for messages */}
        {pathname.startsWith('/profile') && <Link href="/settings"><Button variant="ghost" size="icon" className="rounded-full"><Settings className="h-6 w-6" /></Button></Link>} {/* Settings button for profile */}
      </div>
    </header>
  )
}

function MobileNavigation() {
    const pathname = usePathname();
    const { unreadCount } = useMessages();
    const isMobile = useIsMobile();
    const { isVisible } = useScrollDirection({ enableMobileNav: isMobile });
    const mobileNavItems = [
      { href: '/home', label: 'Home', icon: Home, count: 0 },
      { href: '/search', label: 'Search', icon: Search, count: 0 },
      { href: '/random-chat', label: 'Go Random', icon: Compass, count: 0 },
      { href: '/messages', label: 'Messages', icon: MessageSquare, count: unreadCount },
      { href: '/profile', label: 'Profile', icon: User, count: 0 },
    ]

    return (
                      <motion.nav 
          className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-background/95 backdrop-blur-lg border-t border-border/50 flex justify-around items-center z-50 shadow-lg"
          initial={{ y: 0 }}
          animate={{ y: isVisible ? 0 : 80 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
        {mobileNavItems.map((item) => {
            const isActive = pathname === item.href || 
                             (item.href === '/profile' && pathname.startsWith('/profile/')) ||
                             (item.href === '/messages' && pathname.startsWith('/messages/'));
            return (
                 <Link key={item.href} href={item.href} className="flex-1 flex justify-center flex-col items-center gap-1 text-xs relative">
                    <div className={cn("flex items-center justify-center rounded-full transition-all duration-300 w-12 h-12", isActive ? "text-white" : "text-muted-foreground")}>
                      {isActive ? (
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-accent">
                          <item.icon className="h-6 w-6" />
                        </div>
                      ) : (
                        <item.icon className="h-7 w-7" />
                      )}
                    </div>
                    <span className={cn(isActive ? "font-bold text-primary" : "text-muted-foreground" )}>{item.label}</span>
                     {item.count > 0 && (
                      <span className="absolute top-1 right-4 block h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold ring-2 ring-background leading-tight text-center pt-px">
                        {item.count}
                      </span>
                    )}
                </Link>
            )
        })}
      </motion.nav>
    )
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { isCollapsed } = useSidebar();
  const { isVisible: isFooterVisible } = useScrollDirection({ enableMobileNav: isMobile });
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, user => {
        setCurrentUser(user);
    });
  }, []);

  // Removed: useEffect to manage user status (online/offline) and connectedRef
  // This logic is now centralized in RandomChatPage to prevent conflicts

  if (isMobile === undefined) {
    return <FullscreenSkeletonLoader />;
  }
  
  const showMobileHeader = pathname === '/home';

  if (isMobile) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        {showMobileHeader && <MobileHeader />}
        <main className={cn(
          "flex-1 flex flex-col transition-all duration-300 ease-out no-bounce",
          // Top padding only when header is shown
          showMobileHeader ? "pt-16" : "pt-4",
          // Only apply mobile-specific padding adjustments
          isFooterVisible ? "pb-20" : "pb-4"
        )}>
          <div className="p-4 sm:p-6 flex-1 flex flex-col">
            {children}
          </div>
        </main>
        <MobileNavigation />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Navigation />
             <main className={cn(
         "flex-1 p-4 sm:p-6 lg:p-8 transition-all duration-200 ease-in-out",
         isCollapsed ? "ml-[5rem]" : "ml-[16rem]"
       )}>
        <div className="h-full">
         {children}
        </div>
      </main>
    </div>
  );
}


export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <NotificationProvider>
        <MessageProvider>
          <PresenceManager />
          <AppLayoutContent>{children}</AppLayoutContent>
        </MessageProvider>
      </NotificationProvider>
    </SidebarProvider>
  );
}
