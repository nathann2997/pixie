"use client";

import { createContext, useContext } from 'react';
import { User } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

interface FirebaseContextType {
  user: User | null | undefined;
  loading: boolean;
  error: Error | undefined;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  loading: true,
  error: undefined,
});

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, loading, error] = useAuthState(auth);

  return (
    <FirebaseContext.Provider value={{ user, loading, error }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  return useContext(FirebaseContext);
}
