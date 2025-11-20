
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Compass, User, Bot, MessageSquare, Search, Settings, PanelLeft, PanelRight, MessageCircle, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useSidebar } from '@/context/sidebar-context';
import { useNotifications } from '@/context/notification-context';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Logo } from '@/components/logo';

const mainNavItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/random-chat', label: 'Go Random', icon: Compass },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/ai-assistant', label: 'Blink AI', icon: Bot },
];


function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
    const pathname = usePathname();
    const { isCollapsed } = useSidebar();
    const { pendingCount } = useNotifications();
    const isActive = pathname.startsWith(href) && (href !== '/home' || pathname === '/home');

    return (
         <Tooltip>
            <TooltipTrigger asChild>
                <Link href={href} className={cn(
                    "flex items-center gap-4 p-3 rounded-md hover:bg-muted relative",
                    isActive && "bg-primary text-primary-foreground hover:bg-primary/90",
                    isCollapsed && "justify-center"
                )}>
                    <Icon className="h-6 w-6" />
                    <span className={cn(isCollapsed && "hidden")}>{label}</span>
                    {label === 'Notifications' && pendingCount > 0 && (
                         <span className={cn("absolute top-1 right-1 block h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold leading-tight text-center pt-px", isCollapsed && "top-0 right-0")}>
                            {pendingCount}
                        </span>
                    )}
                </Link>
            </TooltipTrigger>
             {isCollapsed && (
                <TooltipContent side="right">{label}</TooltipContent>
             )}
        </Tooltip>
    )
}

function ProfileLink() {
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    const { isCollapsed } = useSidebar();


    return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
               <Link href="/profile" className={cn("flex items-center gap-2 p-2 rounded-md hover:bg-black/20", isCollapsed && "justify-center")}>
                  <Avatar className={cn("h-9 w-9")}>
                      <AvatarImage src={currentUser?.photoURL || ''} />
                      <AvatarFallback>{currentUser?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <span className={cn("font-semibold", isCollapsed && "hidden")}>{currentUser?.displayName}</span>
              </Link>
            </TooltipTrigger>
            {isCollapsed && (
                <TooltipContent side="right">Profile</TooltipContent>
            )}
           </Tooltip>
        </TooltipProvider>

    )
}

function SidebarToggle() {
    const { isCollapsed, toggleSidebar } = useSidebar();
    return (
        <TooltipProvider delayDuration={0}>
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      onClick={toggleSidebar}
                      className={cn("w-full justify-start gap-4 p-3", isCollapsed && "justify-center")}
                    >
                        {isCollapsed ? <PanelRight className="h-6 w-6" /> : <PanelLeft className="h-6 w-6" />}
                        <span className={cn(isCollapsed && "hidden")}>Collapse</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{isCollapsed ? "Expand" : "Collapse"}</TooltipContent>
             </Tooltip>
       </TooltipProvider>
    )
}


export function Navigation() {
  const { isCollapsed } = useSidebar();

  const secondaryNavItems = [
    { href: '/notifications', label: 'Notifications', icon: Bell },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className={cn(
        "fixed top-0 left-0 h-full text-card-foreground transition-all duration-300 ease-in-out z-50 flex flex-col",
        isCollapsed ? "w-[5rem]" : "w-[16rem]"
    )}>
        <div className={cn("flex items-center p-4 h-[4.5rem]", isCollapsed ? 'justify-center' : 'justify-between')}>
            <div className={cn("flex items-center gap-2", isCollapsed && "justify-center w-full")}> 
                <Logo />
                <span className={cn("text-lg font-bold", isCollapsed && "hidden")}>BlinkChat</span>
            </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
            <TooltipProvider delayDuration={0}>
                {mainNavItems.map((item) => (
                    <NavLink key={item.href} {...item} />
                ))}
            </TooltipProvider>
        </nav>
        <div className="p-2 border-t">
            <TooltipProvider delayDuration={0}>
                 {secondaryNavItems.map((item) => (
                    <NavLink key={item.href} {...item} />
                ))}
            </TooltipProvider>
            <ProfileLink />
            <SidebarToggle />
        </div>
    </aside>
  );
}
