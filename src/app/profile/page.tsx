
'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Skeleton } from '@/components/ui/skeleton';

function ProfilePageSkeleton() {
  return (
    <div className="animate-in fade-in">
       <Skeleton className="relative h-48 md:h-64 rounded-2xl" />
        <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-end -mt-20 sm:-mt-24">
                 <Skeleton className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-background" />
                <div className="mt-4 sm:mt-0 sm:ml-auto flex items-center gap-2 w-full sm:w-auto">
                     <Skeleton className="h-10 w-32 rounded-full" />
                     <Skeleton className="h-10 w-32 rounded-full" />
                </div>
            </div>

             <div className="mt-6 space-y-3">
                <Skeleton className="h-8 w-48 rounded-md" />
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-5 w-full max-w-lg rounded-md" />
                <Skeleton className="h-5 w-2/3 max-w-lg rounded-md" />
            </div>

            <div className="mt-6 flex items-center gap-8">
                <div className="text-center space-y-2">
                    <Skeleton className="h-7 w-12 rounded-md" />
                    <Skeleton className="h-4 w-20 rounded-md" />
                </div>
                <div className="text-center space-y-2">
                    <Skeleton className="h-7 w-12 rounded-md" />
                    <Skeleton className="h-4 w-20 rounded-md" />
                </div>
                <div className="text-center space-y-2">
                    <Skeleton className="h-7 w-12 rounded-md" />
                    <Skeleton className="h-4 w-20 rounded-md" />
                </div>
            </div>
            <div className="mt-8">
                <div className="flex space-x-4">
                    <Skeleton className="h-10 flex-1 rounded-t-lg" />
                    <Skeleton className="h-10 flex-1 rounded-t-lg" />
                    <Skeleton className="h-10 flex-1 rounded-t-lg" />
                </div>
            </div>
        </div>
    </div>
  )
}

export default function MyProfilePage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Redirect to the dynamic user profile page with the current user's ID
        router.replace(`/profile/${user.uid}`);
      } else {
        // If no user is logged in, redirect to the login page
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);
  
  // Display a loading state while redirecting
  return (
    <AppLayout>
      <ProfilePageSkeleton />
    </AppLayout>
  );
}
