
'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, User } from 'lucide-react';
import { db } from '@/lib/firebase';
import { ref, query, orderByChild, startAt, endAt, get, limitToFirst } from 'firebase/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

type UserSearchResult = {
  uid: string;
  username: string;
  avatar: string;
  bio: string;
};

function SearchSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 flex flex-col items-center text-center bg-muted/50 rounded-lg">
                <Skeleton className="w-24 h-24 rounded-full mt-4" />
                <Skeleton className="h-6 w-3/4 mt-4 rounded-md" />
                <Skeleton className="h-4 w-11/12 mt-2 rounded-md" />
                <Skeleton className="h-4 w-3/4 mt-1 rounded-md" />
                <Skeleton className="h-10 w-full mt-4 rounded-md" />
            </div>
        ))}
    </div>
  )
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      const trimmedQuery = searchQuery.trim();
      if (trimmedQuery === '') {
        setResults([]);
        setIsLoading(false);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      setHasSearched(true);
      try {
        const usersRef = ref(db, 'users');
        // The \uf8ff character is a high-valued Unicode character that can be used to define a range for string matching in Firebase.
        const userQuery = query(
          usersRef,
          orderByChild('username_lowercase'),
          startAt(trimmedQuery.toLowerCase()),
          endAt(trimmedQuery.toLowerCase() + '\uf8ff'),
          limitToFirst(10)
        );

        const snapshot = await get(userQuery);
        const searchResults: UserSearchResult[] = [];
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            const userData = childSnapshot.val();
            searchResults.push({
              uid: childSnapshot.key!,
              username: userData.username,
              avatar: userData.avatar,
              bio: userData.bio,
            });
          });
        }
        setResults(searchResults);
      } catch (error) {
        console.error('Error searching for users:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      searchUsers();
    }, 300); // Debounce search to avoid too many requests

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  return (
    <AppLayout>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header>
          <h1 className="text-4xl font-bold font-headline">Find Users</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Search for other people on BlinkChat by their username.
          </p>
        </header>

        <div className="mt-8">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by username..."
              className="h-14 pl-12 text-lg bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-8">
          {isLoading && (
            <SearchSkeleton />
          )}

          {!isLoading && hasSearched && results.length === 0 && (
            <div className="text-center p-12 rounded-lg">
              <h3 className="text-xl font-semibold">No users found</h3>
              <p className="text-muted-foreground mt-2">
                Try a different search query or check the username for typos.
              </p>
            </div>
          )}
          
          {!isLoading && results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((user) => (
                    <div key={user.uid} className="p-4 flex flex-col items-center text-center bg-muted/50 rounded-lg">
                        <Avatar className="w-24 h-24 mt-4">
                            <AvatarImage src={user.avatar} className="object-cover" data-ai-hint="profile picture" />
                            <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <h3 className="mt-4 text-xl font-bold font-headline">{user.username}</h3>
                        <p className="mt-1 text-muted-foreground text-sm flex-grow">{user.bio}</p>
                        <Button asChild className="mt-4 w-full">
                            <Link href={`/profile/${user.uid}`}>View Profile</Link>
                        </Button>
                    </div>
                ))}
            </div>
          )}

           {!isLoading && !hasSearched && (
            <div className="text-center p-12 flex flex-col items-center rounded-lg">
                <User className="h-16 w-16 text-muted-foreground mb-4"/>
              <h3 className="text-xl font-semibold">Search for a user</h3>
              <p className="text-muted-foreground mt-2">
                Start typing in the search bar above to find someone.
              </p>
            </div>
           )}

        </div>
      </div>
    </AppLayout>
  );
}
