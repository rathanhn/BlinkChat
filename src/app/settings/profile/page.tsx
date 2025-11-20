
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { User as FirebaseUser, updateProfile } from 'firebase/auth';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ref, update, get, onValue } from 'firebase/database';
import { db, auth } from '@/lib/firebase';
import { uploadImage } from '@/actions/upload';
import Image from 'next/image';
import { DEFAULT_BANNER_URL } from '@/lib/branding';
import { Upload, X, Shuffle, Loader2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Cropper from 'react-easy-crop'
import type { Point, Area } from 'react-easy-crop'
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { UserProfile } from '@/app/profile/[userId]/page';
import { getBanners } from '@/actions/unsplash';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

const profileFormSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  username: z.string().min(3, 'Username must be at least 3 characters.').max(20, 'Username must be less than 20 characters.'),
  bio: z.string().max(160, 'Bio must be less than 160 characters.').optional(),
  link: z.string().url('Please enter a valid URL.').optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const avatarCategories = [
  { value: 'bottts', label: 'Robots' },
  { value: 'lorelei', label: 'Cartoon' },
  { value: 'adventurer', label: 'Adventurer' },
  { value: 'micah', label: 'Avatars' },
  { value: 'initials', label: 'Initials' },
];

/**
 * Creates a cropped image.
 * @param {string} imageSrc - The source of the image to crop.
 * @param {Area} pixelCrop - The area to crop in pixels.
 * @returns {Promise<string>} - A Promise that resolves with the cropped image as a data URL.
 */
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.src = imageSrc;
    image.setAttribute('crossOrigin', 'anonymous');
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = (error) => {
          reject(error);
        };
      }, 'image/png');
    };
    image.onerror = (error) => {
      reject(error);
    };
  });
}


function ImageCropDialog({
  isOpen,
  onClose,
  imageSrc,
  onSave,
  aspect = 1,
}: {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onSave: (dataUrl: string) => void;
  aspect?: number;
}) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (croppedAreaPixels && imageSrc) {
        try {
            const croppedImageUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
            onSave(croppedImageUrl);
        } catch (e) {
            console.error(e)
        }
    }
  };


  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
          <DialogDescription>Adjust the selection to crop your image.</DialogDescription>
        </DialogHeader>
        <div className="relative w-full h-80 bg-background my-4">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function BannerSelectDialog({ isOpen, onClose, onSelect }: { isOpen: boolean, onClose: () => void, onSelect: (url: string) => void }) {
  const [banners, setBanners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBanners = useCallback(async (query?: string) => {
    setIsLoading(true);
    getBanners(query)
      .then((res) => {
        if (res) setBanners(res);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchBanners();
    }
  }, [isOpen, fetchBanners]);

  const handleSelect = (url: string) => {
    onSelect(url);
    onClose();
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBanners(searchQuery);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Find a Banner</DialogTitle>
          <DialogDescription>Choose a high-quality banner image from Unsplash.</DialogDescription>
        </DialogHeader>
        <div className="h-[60vh]">
            <ScrollArea className="h-full">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-1">
                        {banners.map(banner => (
                            <button key={banner.id} onClick={() => handleSelect(banner.urls.regular)} className="relative aspect-[3/1] w-full rounded-md overflow-hidden group">
                                <Image src={banner.urls.small} fill sizes="(max-width: 768px) 50vw, 33vw" alt={banner.alt_description || 'Banner image'} className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <p className="text-white font-bold">Select</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
        <DialogFooter>
            <form onSubmit={handleSearch} className="w-full flex gap-2">
                <Input 
                    placeholder="Search for banners..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button type="submit" disabled={isLoading}>
                     {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>}
                    Search
                </Button>
            </form>
            <Button variant="outline" onClick={() => fetchBanners()} disabled={isLoading}>
                Random
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingsSkeleton() {
  return (
    <div className="animate-in fade-in">
      <header className="mb-8">
          <Skeleton className="h-10 w-1/3 rounded-lg" />
          <Skeleton className="h-6 w-1/2 mt-3 rounded-lg" />
      </header>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Images</CardTitle>
            <CardDescription>Update your avatar and profile banner.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Banner Image</Label>
              <Skeleton className="aspect-[3/1] w-full max-w-lg rounded-md" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>User Details</CardTitle>
                <CardDescription>Update your public profile information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Skeleton className="h-20 w-full rounded-md" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="link">External Link</Label>
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
              <CardTitle>Interests</CardTitle>
              <CardDescription>Manage your interests to get better matches.</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-full rounded-md" /> {/* Interest input */}
                <Skeleton className="h-10 w-20 rounded-md" /> {/* Add button */}
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-4">
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-16 rounded-full" />
              </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
              <div className="flex justify-end w-full">
                <Skeleton className="h-12 w-40 rounded-md" /> {/* Save All Changes button */}
              </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}


export default function EditProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  const [newBannerDataUri, setNewBannerDataUri] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [newAvatarDataUri, setNewAvatarDataUri] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [avatarCategory, setAvatarCategory] = useState('bottts');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');

  const [cropState, setCropState] = useState<{
    imageSrc: string;
    aspect: number;
    type: 'avatar' | 'banner';
  } | null>(null);
  
  const [isBannerSelectOpen, setIsBannerSelectOpen] = useState(false);

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: '', username: '', bio: '', link: '' },
  });

   useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
        if (user) {
            setCurrentUser(user);
            const userRef = ref(db, `users/${user.uid}`);
            onValue(userRef, (snapshot) => {
                const data = snapshot.val();
                if(data) {
                    setProfile(data);
                    reset({
                        name: data.name || '',
                        username: data.username || '',
                        bio: data.bio || '',
                        link: data.link || '',
                    });
                    setInterests(data.interests || []);
                    setBannerPreview(data.banner || '');
                    setAvatarPreview(data.avatar || '');
                }
                setIsPageLoading(false);
            });
        } else {
            router.push('/login');
        }
    });

    return () => unsubscribeAuth();
  }, [router, reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner', aspect: number) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropState({ imageSrc: reader.result as string, type, aspect });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCroppedImageSave = (dataUrl: string) => {
    if (!cropState) return;

    if (cropState.type === 'avatar') {
      setNewAvatarDataUri(dataUrl);
      setAvatarPreview(dataUrl);
    } else {
      setNewBannerDataUri(dataUrl);
      setBannerPreview(dataUrl);
    }
    setCropState(null);
  };


  const generateRandomAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    const url = `https://api.dicebear.com/8.x/${avatarCategory}/svg?seed=${randomSeed}`;
    setAvatarPreview(url);
    setNewAvatarDataUri(url);
  };
  
  const handleAddInterest = () => {
    const processedInterest = newInterest.trim().toLowerCase();
    if (processedInterest && !interests.includes(processedInterest)) {
      setInterests([...interests, processedInterest]);
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interestToRemove: string) => {
    setInterests(interests.filter(interest => interest !== interestToRemove));
  };
  
  const onSubmit = async (data: ProfileFormValues) => {
    if (!currentUser || !profile) {
        toast({ title: 'Not authenticated', description: 'Please log in again.', variant: 'destructive'});
        return;
    }
    setIsLoading(true);
    try {
      let finalAvatarUrl = profile.avatar;
      let finalBannerUrl = profile.banner;

      if (newAvatarDataUri) {
          if(newAvatarDataUri.startsWith('data:image')) {
            const res = await uploadImage(newAvatarDataUri);
            finalAvatarUrl = res.secure_url;
          } else { // It's a dicebear URL
            finalAvatarUrl = newAvatarDataUri;
          }
      }

      if (newBannerDataUri) {
        if(newBannerDataUri.startsWith('data:image')) {
          const res = await uploadImage(newBannerDataUri);
          finalBannerUrl = res.secure_url;
        } else { // It's an Unsplash URL
            finalBannerUrl = newBannerDataUri;
        }
      }

      const updates: { [key: string]: any } = {};
      
      updates[`/users/${currentUser.uid}/name`] = data.name;
      updates[`/users/${currentUser.uid}/username_lowercase`] = data.username.toLowerCase();

      if (data.username.toLowerCase() !== profile.username.toLowerCase()) {
        const usernameRef = ref(db, 'usernames/' + data.username.toLowerCase());
        const usernameSnapshot = await get(usernameRef);
        if (usernameSnapshot.exists()) {
          toast({
            title: 'Error',
            description: 'Username is already taken.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
        updates[`/users/${currentUser.uid}/username`] = data.username;
        updates[`/usernames/${profile.username.toLowerCase()}`] = null;
        updates[`/usernames/${data.username.toLowerCase()}`] = currentUser.uid;
      }

      updates[`/users/${currentUser.uid}/banner`] = finalBannerUrl;
      updates[`/users/${currentUser.uid}/avatar`] = finalAvatarUrl;
      updates[`/users/${currentUser.uid}/bio`] = data.bio;
      updates[`/users/${currentUser.uid}/link`] = data.link;
      updates[`/users/${currentUser.uid}/interests`] = interests;
      
      await update(ref(db), updates);
      
      if(finalAvatarUrl !== currentUser.photoURL || data.name !== currentUser.displayName) {
          await updateProfile(currentUser, {
              displayName: data.name,
              photoURL: finalAvatarUrl
          });
      }

      toast({
        title: 'Success',
        description: 'Your profile has been updated.',
      });
      router.push(`/profile/${currentUser.uid}`);
    } catch (error: any) {
      console.error("Full upload error details:", error);
      toast({
        title: 'Error updating profile',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
   if (isPageLoading || !profile || !currentUser) {
    return (
      <AppLayout>
        <SettingsSkeleton />
      </AppLayout>
    );
  }

  return (
    <>
    <AppLayout>
       <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="mb-8">
            <h1 className="text-4xl font-bold font-headline">Edit Profile</h1>
            <p className="text-muted-foreground mt-2 text-lg">
                Manage your public profile information.
            </p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Images</CardTitle>
                        <CardDescription>Update your avatar and profile banner.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Avatar</Label>
                            <div className="flex items-center gap-4">
                                <Avatar className="w-20 h-20">
                                    <AvatarImage src={avatarPreview} className="object-cover" />
                                    <AvatarFallback>{profile.username.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col gap-2 w-full max-w-xs">
                                    <input type="file" ref={avatarInputRef} onChange={(e) => handleFileChange(e, 'avatar', 1)} className="hidden" accept="image/*" />
                                    <Button type="button" variant="outline" onClick={() => avatarInputRef.current?.click()}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload
                                    </Button>
                                    <div className="flex gap-2">
                                    <Select value={avatarCategory} onValueChange={setAvatarCategory}>
                                        <SelectTrigger>
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
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Banner Image</Label>
                            <div className="mt-2 aspect-[3/1] w-full max-w-lg relative rounded-md overflow-hidden border">
                                <Image src={bannerPreview || DEFAULT_BANNER_URL} fill sizes="100vw" priority className="object-cover" alt="Profile banner preview" />
                                <input type="file" ref={bannerInputRef} onChange={(e) => handleFileChange(e, 'banner', 3 / 1)} className="hidden" accept="image/*" />
                                <div className="absolute top-2 right-2 flex gap-2">
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="icon"
                                        onClick={() => bannerInputRef.current?.click()}
                                        className="bg-black/50 hover:bg-black/70 border-none text-white h-8 w-8"
                                        title="Upload from computer"
                                    >
                                        <Upload className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="icon"
                                        onClick={() => {
                                            setNewBannerDataUri(null);
                                            setIsBannerSelectOpen(true)}
                                        }
                                        className="bg-black/50 hover:bg-black/70 border-none text-white h-8 w-8"
                                        title="Find a banner on Unsplash"
                                    >
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>User Details</CardTitle>
                        <CardDescription>Update your public profile information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Display Name</Label>
                            <Controller
                            name="name"
                            control={control}
                            render={({ field }) => <Input id="name" {...field} />}
                            />
                            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Controller
                            name="username"
                            control={control}
                            render={({ field }) => <Input id="username" {...field} />}
                            />
                            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bio">Bio</Label>
                            <Controller
                            name="bio"
                            control={control}
                            render={({ field }) => (
                                <Textarea
                                id="bio"
                                placeholder="Tell us a little bit about yourself"
                                className="resize-none"
                                {...field}
                                />
                            )}
                            />
                            {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="link">External Link</Label>
                            <Controller
                            name="link"
                            control={control}
                            render={({ field }) => <Input id="link" placeholder="https://example.com" {...field} />}
                            />
                            {errors.link && <p className="text-sm text-destructive">{errors.link.message}</p>}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Interests</CardTitle>
                        <CardDescription>Manage your interests to get better matches.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Input
                                value={newInterest}
                                onChange={(e) => setNewInterest(e.target.value)}
                                placeholder="Add an interest and press Enter"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddInterest();
                                    }
                                }}
                            />
                            <Button type="button" onClick={handleAddInterest}>Add</Button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap min-h-[28px] mt-4">
                            {interests.map(interest => (
                            <Badge key={interest} variant="secondary" className="py-1 px-2">
                                {interest}
                                <button onClick={() => handleRemoveInterest(interest)} className="ml-1.5 rounded-full hover:bg-black/20 p-0.5">
                                <X className="h-3 w-3" />
                                </button>
                            </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" disabled={isLoading} size="lg">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save All Changes
                    </Button>
                </div>
            </div>
        </form>
       </div>
    </AppLayout>

    <ImageCropDialog
        isOpen={!!cropState}
        onClose={() => setCropState(null)}
        imageSrc={cropState?.imageSrc || ''}
        onSave={handleCroppedImageSave}
        aspect={cropState?.aspect}
    />
    <BannerSelectDialog 
        isOpen={isBannerSelectOpen}
        onClose={() => setIsBannerSelectOpen(false)}
        onSelect={(url) => {
            setBannerPreview(url);
            setNewBannerDataUri(url);
        }}
    />
    </>
  );
}
