import { AppLayout } from '@/components/app-layout';
import { AIChatClient } from '@/components/ai-chat-client';
import { Film, MessageSquare, HeartPulse } from 'lucide-react';

export default function AiAssistantPage() {
  const suggestions = [
    {
      title: 'Suggest me some movies',
      prompt: 'I like sci-fi and comedy movies.',
      flow: 'movies' as const,
      icon: <Film className="h-5 w-5" />,
    },
    {
      title: 'What to talk about?',
      prompt: 'My interests are technology and travel.',
      flow: 'topics' as const,
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      title: 'How to deal with stress?',
      prompt: 'I\'m feeling stressed about work.',
      flow: 'stress' as const,
      icon: <HeartPulse className="h-5 w-5" />,
    },
  ];

  return (
    <AppLayout>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-6rem)]">
        <AIChatClient suggestions={suggestions} />
      </div>
    </AppLayout>
  );
}
