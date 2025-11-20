export type FriendlyError = {
  title: string;
  description: string;
};

function isFirebaseError(err: any): err is { code?: string; message?: string } {
  return !!err && (typeof err.code === 'string' || typeof err.message === 'string');
}

export function translateError(err: unknown): FriendlyError {
  // Default fallback
  const fallback: FriendlyError = {
    title: 'Something went wrong',
    description: 'Please try again. If the problem persists, try again later.'
  };

  if (!err) return fallback;

  // Firebase Auth errors
  if (isFirebaseError(err)) {
    const code = (err.code || '').toLowerCase();
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/invalid-email':
        return { title: 'Invalid credentials', description: 'Check your email/username and password.' };
      case 'auth/user-not-found':
        return { title: 'Account not found', description: 'No account exists with these details.' };
      case 'auth/wrong-password':
        return { title: 'Incorrect password', description: 'Please re-enter your password.' };
      case 'auth/too-many-requests':
        return { title: 'Too many attempts', description: 'Please wait a moment and try again.' };
      case 'auth/popup-closed-by-user':
        return { title: 'Sign-in cancelled', description: 'You closed the sign-in window.' };
      case 'auth/account-exists-with-different-credential':
        return { title: 'Account exists', description: 'Try signing in with a different provider for this email.' };
      case 'auth/network-request-failed':
        return { title: 'Network issue', description: 'Check your internet connection and try again.' };
      default:
        break;
    }

    // Message-based fallbacks
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('network')) {
      return { title: 'Network issue', description: 'Check your internet connection and try again.' };
    }
  }

  // Cloudinary config/upload errors
  const message = String((err as any)?.message || '').toLowerCase();
  if (message.includes('cloudinary is not configured') || message.includes('must supply api_key')) {
    return {
      title: 'Image upload not available',
      description: 'Image service is not configured. Please try again later or skip image upload.'
    };
  }

  // Firebase Auth: domain not authorized for OAuth
  if (message.includes('domain is not authorized for oauth operations')) {
    return {
      title: 'Sign-in not available on this domain',
      description: 'The current site is not authorized for Google/GitHub sign-in. Please use the official domain.'
    };
  }

  // Realtime Database index errors (developer-facing) → user-friendly
  if (message.includes('index not defined')) {
    return {
      title: 'Loading issue',
      description: 'We could not fetch data right now. Please try again shortly.'
    };
  }

  return fallback;
}


