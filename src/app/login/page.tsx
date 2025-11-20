
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/auth-layout';
import { Chrome, Github, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { db } from '@/lib/firebase';
import { ref, get, query as dbQuery, orderByChild, equalTo } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { translateError } from '@/lib/errors';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState(''); // email or username
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [matchedUsername, setMatchedUsername] = useState<string | null>(null);
  const [isCheckingIdentifier, setIsCheckingIdentifier] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Determine if identifier is email or username
      const looksLikeEmail = /@/.test(identifier);
      let emailToUse = identifier.trim();

      console.log('[Login] handleLogin start', { identifier, looksLikeEmail });

      if (!looksLikeEmail) {
        // Username path: resolve to email via usernames -> uid -> users/{uid}/email
        const username = identifier.trim().toLowerCase();
        console.log('[Login] Resolving username to uid', { username });
        const usernameRef = ref(db, 'usernames/' + username);
        const usernameSnap = await get(usernameRef);
        console.log('[Login] usernameSnap.exists', usernameSnap.exists());
        if (!usernameSnap.exists()) {
          throw new Error('Username not found.');
        }
        const uid = usernameSnap.val();
        console.log('[Login] Resolved uid from username', { uid });
        const userSnap = await get(ref(db, 'users/' + uid));
        console.log('[Login] userSnap.exists for uid', uid, userSnap.exists());
        if (!userSnap.exists() || !userSnap.val()?.email) {
          throw new Error('Account is missing an email.');
        }
        emailToUse = userSnap.val().email;
      }

      console.log('[Login] Signing in with email', { emailToUse });
      await signInWithEmailAndPassword(auth, emailToUse, password);
      router.push('/home');
    } catch (error: any) {
      console.error('[Login] handleLogin error', error);
      const friendly = translateError(error);
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/home');
    } catch (error: any) {
      const friendly = translateError(error);
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setIsGithubLoading(true);
    try {
      const provider = new GithubAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/home');
    } catch (error: any) {
      const friendly = translateError(error);
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive' });
    } finally {
      setIsGithubLoading(false);
    }
  };

  // Live check: if identifier is an email, show the corresponding username for confirmation
  useEffect(() => {
    const value = identifier.trim();
    if (!value || !/@/.test(value)) {
      setMatchedUsername(null);
      return;
    }
    setIsCheckingIdentifier(true);
    console.log('[Login] identifier changed, treating as email', { value });
    const t = setTimeout(async () => {
      try {
        // Primary: use /emails map for reliable lookup
        const emailKey = value.toLowerCase();
        const emailKeySanitized = emailKey.replace(/\./g, ',');
        const emailRef = ref(db, 'emails/' + emailKeySanitized);
        const emailSnap = await get(emailRef);
        console.log('[Login] emails map lookup', { emailKey, emailKeySanitized, exists: emailSnap.exists() });
        if (emailSnap.exists()) {
          const uid = emailSnap.val();
          console.log('[Login] Resolved uid from emails map', { uid });
          const userRef = ref(db, 'users/' + uid);
          const userSnap = await get(userRef);
          console.log('[Login] users lookup by uid', { uid, exists: userSnap.exists() });
          setMatchedUsername(userSnap.val()?.username || null);
        } else {
          console.warn('[Login] emails map miss; scanning users for email match (no index).');
          const allUsersSnap = await get(ref(db, 'users'));
          if (allUsersSnap.exists()) {
            const usersVal = allUsersSnap.val() as Record<string, any>;
            const emailLower = emailKey;
            let foundUsername: string | null = null;
            let scanned = 0;
            for (const uid of Object.keys(usersVal)) {
              const u = usersVal[uid];
              scanned++;
              const e = (u?.email || '').toLowerCase();
              const el = (u?.email_lowercase || '').toLowerCase();
              if (e === emailLower || el === emailLower) {
                foundUsername = u?.username || null;
                console.log('[Login] scan matched uid', { uid, username: foundUsername });
                break;
              }
            }
            console.log('[Login] scan complete', { scanned, found: !!foundUsername });
            setMatchedUsername(foundUsername);
          } else {
            console.warn('[Login] users root is empty or not readable.');
            setMatchedUsername(null);
          }
        }
      } catch (err) {
        console.error('[Login] identifier lookup error', err);
        setMatchedUsername(null);
      } finally {
        setIsCheckingIdentifier(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [identifier]);

  return (
    <AuthLayout
      title="Welcome Back!"
      description="Log in to continue your conversations."
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="identifier">Email or Username</Label>
          <Input id="identifier" type="text" placeholder="you@example.com or your_username" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          {/@/.test(identifier) && (
            <p className={`text-xs ${matchedUsername ? 'text-green-600' : 'text-muted-foreground'}`}>
              {isCheckingIdentifier ? 'Looking up username…' : matchedUsername ? `Username: ${matchedUsername}` : 'No account found for this email yet'}
            </p>
          )}
        </div>
        <div className="space-y-2 relative">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-muted-foreground">
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        <Button type="submit" className="w-full !mt-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" disabled={isLoading}>
          {isLoading ? 'Logging In...' : 'Log In'}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" onClick={handleGoogleLogin} disabled={isGoogleLoading}>
          {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />} Google
        </Button>
        <Button variant="outline" onClick={handleGithubLogin} disabled={isGithubLoading}>
          {isGithubLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />} GitHub
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          Sign Up
        </Link>
      </p>
    </AuthLayout>
  );
}
