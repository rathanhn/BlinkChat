'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get, update } from 'firebase/database';

function sanitizeEmailKey(email: string) {
  return email.toLowerCase().replace(/\./g, ',');
}

export default function BackfillEmailsPage() {
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{processed: number; written: number; skipped: number}>({ processed: 0, written: 0, skipped: 0 });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUid(user ? user.uid : null);
    });
    return () => unsub();
  }, []);

  const runBackfill = async () => {
    if (!currentUid) {
      setStatus('You must be logged in to run backfill.');
      return;
    }
    setIsRunning(true);
    setStatus('Fetching users...');
    setResult({ processed: 0, written: 0, skipped: 0 });

    try {
      const usersSnap = await get(ref(db, 'users'));
      if (!usersSnap.exists()) {
        setStatus('No users found.');
        setIsRunning(false);
        return;
      }

      const updates: Record<string, any> = {};
      let processed = 0;
      let written = 0;
      let skipped = 0;

      usersSnap.forEach((child) => {
        processed += 1;
        const uid = child.key as string;
        const val = child.val() || {};
        const email: string | undefined = val.email;
        if (email && typeof email === 'string') {
          const key = sanitizeEmailKey(email);
          updates['/emails/' + key] = uid;
          written += 1;
        } else {
          skipped += 1;
        }
      });

      setStatus('Writing emails map...');
      await update(ref(db), updates);

      setResult({ processed, written, skipped });
      setStatus('Backfill complete.');
    } catch (err: any) {
      setStatus('Error: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold font-headline">Backfill Emails Map</h1>
        <p className="text-muted-foreground mt-2">
          Populate /emails/{'{{sanitized_email}}'}= uid for all existing users so email lookups work instantly.
        </p>
        <div className="mt-4">
          <Button onClick={runBackfill} disabled={isRunning}>
            {isRunning ? 'Running…' : 'Run Backfill'}
          </Button>
        </div>
        <div className="mt-4 space-y-1 text-sm">
          <p>Status: {status}</p>
          <p>Processed: {result.processed}</p>
          <p>Written: {result.written}</p>
          <p>Skipped (no email): {result.skipped}</p>
        </div>
      </div>
    </AppLayout>
  );
}
