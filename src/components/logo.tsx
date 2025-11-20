
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

export function Logo() {
  return (
    <Link href="/home" className="flex items-center justify-center gap-2 group">
      <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-accent transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
        <MessageCircle className="h-6 w-6 text-white" />
      </div>
    </Link>
  );
}
