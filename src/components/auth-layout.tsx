
import { Logo } from "@/components/logo";

export function AuthLayout({ children, title, description }: { children: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="absolute top-8">
        <Logo />
      </div>
      <main className="w-full max-w-md animate-in fade-in slide-in-from-bottom-10 duration-500">
        <div className="bg-background/60 backdrop-blur-lg rounded-2xl border border-white/10 shadow-lg p-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold font-headline text-foreground">{title}</h2>
              <p className="text-muted-foreground mt-2">{description}</p>
            </div>
            {children}
        </div>
      </main>
    </div>
  );
}
