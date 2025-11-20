
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/auth-layout';
import { Chrome, Github, Upload, Shuffle, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { ref, set, get, update } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { uploadImage } from '@/actions/upload';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { DEFAULT_BANNER_URL } from '@/lib/branding';
import { translateError } from '@/lib/errors';

const avatarCategories = [
  { value: 'bottts', label: 'Robots' },
  { value: 'lorelei', label: 'Cartoon' },
  { value: 'adventurer', label: 'Adventurer' },
  { value: 'micah', label: 'Avatars' },
  { value: 'initials', label: 'Initials' },
];

const adjectives = ["Quick", "Lazy", "Sleepy", "Noisy", "Hungry", "Happy", "Angry", "Silly", "Crazy", "Brave"];
const nouns = ["Fox", "Dog", "Cat", "Bear", "Lion", "Tiger", "Panda", "Koala", "Wolf", "Eagle"];


function PasswordStrength({ password }: { password?: string }) {
    const [strength, setStrength] = useState({ score: 0, label: '', color: '' });

    useEffect(() => {
        let score = 0;
        let label = 'Weak';
        let color = 'bg-red-500';

        if (password) {
            if (password.length >= 8) score++;
            if (/[A-Z]/.test(password)) score++;
            if (/[a-z]/.test(password)) score++;
            if (/[0-9]/.test(password)) score++;
            if (/[^A-Za-z0-9]/.test(password)) score++;
        }
        
        switch (score) {
            case 5:
                label = 'Very Strong';
                color = 'bg-green-500';
                break;
            case 4:
                label = 'Strong';
                color = 'bg-green-400';
                break;
            case 3:
                label = 'Medium';
                color = 'bg-yellow-500';
                break;
            case 2:
            case 1:
                label = 'Weak';
                color = 'bg-red-500';
                break;
            default:
                label = 'Very Weak';
                color = 'bg-red-700';
        }

        setStrength({ score, label, color });

    }, [password]);

    if (!password) return null;

    return (
        <div className="space-y-1">
            <Progress value={strength.score * 20} className={`h-2 ${strength.color}`} />
            <p className="text-xs text-muted-foreground">{strength.label}</p>
        </div>
    );
}

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [interests, setInterests] = useState('');
  const [username, setUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [avatarCategory, setAvatarCategory] = useState('bottts');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [usernameMessage, setUsernameMessage] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };
  
  const generateRandomAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    const url = `https://api.dicebear.com/8.x/${avatarCategory}/svg?seed=${randomSeed}`;
    setAvatarPreview(url);
    setAvatarFile(null);
  };
  
  const generateRandomUsername = () => {
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const num = Math.floor(Math.random() * 100);
      setUsername(`${adj}${noun}${num}`);
  }

  const sanitizeEmailKey = (email: string) => email.toLowerCase().replace(/\./g, ',');

  async function ensureUniqueUsername(base: string): Promise<string> {
    const normalized = base.trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user';
    let candidate = normalized;
    for (let i = 0; i < 50; i++) {
      const checkRef = ref(db, 'usernames/' + candidate);
      const snap = await get(checkRef);
      if (!snap.exists()) return candidate;
      candidate = `${normalized}${Math.floor(Math.random() * 1000)}`.slice(0, 20);
    }
    return `${normalized}${Date.now().toString().slice(-4)}`.slice(0, 20);
  }

  const handleProviderSignup = async (provider: 'google' | 'github') => {
    try {
      provider === 'google' ? setIsGoogleLoading(true) : setIsGithubLoading(true);
      const authProvider = provider === 'google' ? new GoogleAuthProvider() : new GithubAuthProvider();
      const cred = await signInWithPopup(auth, authProvider);
      const user = cred.user;

      // If profile exists, route home
      const userSnap = await get(ref(db, `users/${user.uid}`));
      if (userSnap.exists()) {
        router.push('/home');
        return;
      }

      // Create profile with generated username
      const display = user.displayName || name || 'Blink User';
      const photo = user.photoURL || avatarPreview || `https://api.dicebear.com/8.x/${avatarCategory}/svg?seed=${user.uid}`;
      const baseUsername = (display || 'user').toLowerCase().replace(/\s+/g, '_');
      const unique = await ensureUniqueUsername(baseUsername);

      try { await updateProfile(user, { displayName: display, photoURL: photo }); } catch {}

      const interestsArray = interests.split(',').map(i => i.trim()).filter(Boolean);

      const updates: { [key: string]: any } = {};
      updates['/users/' + user.uid] = {
        name: display,
        username: unique,
        username_lowercase: unique,
        email: user.email,
        email_lowercase: (user.email || '').toLowerCase(),
        interests: interestsArray,
        bio: 'Welcome to my BlinkChat profile!',
        link: '',
        stats: { followers: 0, following: 0, blocked: 0 },
        avatar: photo,
        banner: DEFAULT_BANNER_URL,
      };
      updates['/usernames/' + unique] = user.uid;
      if (user.email) {
        updates['/emails/' + sanitizeEmailKey(user.email as string)] = user.uid;
      }
      await update(ref(db), updates);

      router.push('/home');
    } catch (error: any) {
      const friendly = translateError(error);
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive' });
    } finally {
      provider === 'google' ? setIsGoogleLoading(false) : setIsGithubLoading(false);
    }
  }

  // Live username availability check with debounce
  useEffect(() => {
    const value = username.trim().toLowerCase();
    if (!value) {
      setIsUsernameAvailable(null);
      setUsernameMessage('');
      return;
    }
    // Basic validation: 3-20 chars, lowercase letters, numbers, underscore
    const isValid = /^[a-z0-9_]{3,20}$/.test(value);
    if (!isValid) {
      setIsUsernameAvailable(false);
      setUsernameMessage('Use 3-20 chars: a-z, 0-9, underscore');
      return;
    }

    setIsCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const usernameRef = ref(db, 'usernames/' + value);
        const snapshot = await get(usernameRef);
        if (snapshot.exists()) {
          setIsUsernameAvailable(false);
          setUsernameMessage('Username is taken');
        } else {
          setIsUsernameAvailable(true);
          setUsernameMessage('Username is available');
        }
      } catch {
        setIsUsernameAvailable(null);
        setUsernameMessage('');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [username]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: "Signup Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    if (isCheckingUsername) {
      toast({ title: 'Please wait', description: 'Checking username availability...', variant: 'destructive' });
      return;
    }
    if (!username.trim()) {
      toast({ title: 'Signup Error', description: 'Please enter a username.', variant: 'destructive' });
      return;
    }
    if (isUsernameAvailable === false) {
      toast({ title: 'Signup Error', description: 'Username is already taken. Choose another.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);

    try {
      // Final server-side check to avoid race conditions
      const usernameRefCheck = ref(db, 'usernames/' + username.toLowerCase());
      const usernameSnapshot = await get(usernameRefCheck);
      if (usernameSnapshot.exists()) {
        throw new Error('Username was just taken. Please choose another.');
      }

      let avatarUrl = `https://placehold.co/200x200.png?text=${username.charAt(0)}`;
      
      if (avatarFile) {
        const reader = new FileReader();
        reader.readAsDataURL(avatarFile);
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
        });
        const res = await uploadImage(dataUrl);
        if (res.secure_url) {
          avatarUrl = res.secure_url;
        } else {
           throw new Error('Image upload failed.');
        }
      } else if (avatarPreview) {
        avatarUrl = avatarPreview;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: name,
        photoURL: avatarUrl,
      });

      const interestsArray = interests.split(',').map(interest => interest.trim()).filter(i => i);

      // Save user profile and username mapping
      const dbRef = ref(db);
      const updates: { [key: string]: any } = {};
      updates['/users/' + user.uid] = {
        name: name,
        username: username,
        username_lowercase: username.toLowerCase(),
        email: user.email,
        email_lowercase: (user.email || '').toLowerCase(),
        interests: interestsArray,
        bio: 'Welcome to my BlinkChat profile!',
        link: '',
        stats: {
          followers: 0,
          following: 0,
          blocked: 0,
        },
        avatar: avatarUrl,
        banner: DEFAULT_BANNER_URL,
      };
      updates['/usernames/' + username.toLowerCase()] = user.uid;
      if (user.email) {
        updates['/emails/' + sanitizeEmailKey(user.email as string)] = user.uid;
      }

      await update(dbRef, updates);

      router.push('/home');
    } catch (error: any) {
      const friendly = translateError(error);
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Join BlinkChat"
      description="Create an account to start meeting new people."
    >
      <form onSubmit={handleSignup} className="space-y-4">
        <div className="flex flex-col items-center gap-4 mb-6">
            <Avatar className="w-24 h-24">
                <AvatarImage src={avatarPreview} className="object-cover" />
                <AvatarFallback>{name.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
             <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
            <div className="flex gap-2 w-full">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">
                    <Upload className="mr-2 h-4 w-4" /> Upload
                </Button>
                <div className="flex-1 flex gap-2">
                  <Select value={avatarCategory} onValueChange={setAvatarCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {avatarCategories.map(cat => (
                         <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="secondary" onClick={generateRandomAvatar} className="px-3">
                    <Shuffle className="h-4 w-4" />
                  </Button>
                </div>
            </div>
        </div>
        <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input id="name" type="text" placeholder="Your full name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
               <div className="flex items-center">
                    <Input id="username" type="text" placeholder="your_username" required value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} className={`rounded-r-none ${isUsernameAvailable === true ? 'border-green-500' : isUsernameAvailable === false ? 'border-red-500' : ''}`} />
                    <Button type="button" variant="secondary" onClick={generateRandomUsername} className="px-3 rounded-l-none">
                        <Shuffle className="h-4 w-4" />
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isCheckingUsername ? 'Checking availability…' : usernameMessage}
                </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 relative">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-muted-foreground">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                <PasswordStrength password={password} />
            </div>
            <div className="space-y-2 relative">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pr-10" />
               <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-9 text-muted-foreground">
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
            </div>
        </div>
       
        <div className="space-y-2">
          <Label htmlFor="interests">Your Interests (Optional)</Label>
          <Input id="interests" type="text" placeholder="e.g. coding, hiking, movies" value={interests} onChange={(e) => setInterests(e.target.value)} />
           <p className="text-xs text-muted-foreground">Comma separated values.</p>
        </div>
        <Button type="submit" className="w-full !mt-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" disabled={isLoading}>
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or sign up with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" onClick={() => handleProviderSignup('google')} disabled={isGoogleLoading}>
          {isGoogleLoading ? <span className="mr-2 animate-spin">⏳</span> : <Chrome className="mr-2 h-4 w-4" />} Google
        </Button>
        <Button variant="outline" onClick={() => handleProviderSignup('github')} disabled={isGithubLoading}>
          {isGithubLoading ? <span className="mr-2 animate-spin">⏳</span> : <Github className="mr-2 h-4 w-4" />} GitHub
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Log In
        </Link>
      </p>
    </AuthLayout>
  );
}
