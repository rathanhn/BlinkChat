import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, Bot, UserCheck } from 'lucide-react';
import { Logo } from '@/components/logo';

const features = [
  {
    icon: <Users className="h-8 w-8 text-primary" />,
    title: 'Interest-Based Chatting',
    description: 'Connect with people who share your passions.',
  },
  {
    icon: <UserCheck className="h-8 w-8 text-primary" />,
    title: 'Follow/Unfollow Users',
    description: 'Build your own community and stay in touch.',
  },
  {
    icon: <Bot className="h-8 w-8 text-primary" />,
    title: 'Smart AI Assistant',
    description: 'Get conversation starters, movie tips, and more.',
  },
  {
    icon: <MessageSquare className="h-8 w-8 text-primary" />,
    title: 'Profile & Chat Logs',
    description: 'Keep track of your connections and conversations.',
  },
];

export default function SplashPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-b from-background to-primary/10 dark:from-background dark:to-primary/20 p-4 overflow-hidden">
      <div className="text-center animate-in fade-in slide-in-from-bottom-12 duration-500">
        <Logo />
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Welcome to BlinkChat — the modern random chat app where you connect instantly with people who get you.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {features.map((feature, index) => (
          <div
            key={feature.title}
            className="bg-white/30 dark:bg-black/20 backdrop-blur-md p-6 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg animate-in fade-in slide-in-from-bottom-16 duration-700"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center gap-4">
              {feature.icon}
              <h3 className="text-xl font-headline font-semibold text-foreground">{feature.title}</h3>
            </div>
            <p className="mt-2 text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-20 duration-1000">
        <Button asChild size="lg" className="bg-primary/80 hover:bg-primary text-primary-foreground font-bold text-lg px-8 py-6 rounded-full shadow-lg transition-transform transform hover:scale-105">
          <Link href="/signup">Get Started</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="bg-transparent border-primary/50 text-primary-foreground font-bold text-lg px-8 py-6 rounded-full shadow-lg transition-transform transform hover:scale-105 hover:bg-primary/10">
          <Link href="/login">Sign In</Link>
        </Button>
      </div>
    </div>
  );
}
