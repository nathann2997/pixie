"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useFirebase } from '@/components/providers/firebase-provider';

export default function Home() {
  const { user, loading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.push(user ? '/dashboard' : '/login');
    }
  }, [user, loading, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <Image
          src="/pigxel.jpg"
          alt="Pigxel"
          width={96}
          height={32}
          className="object-contain h-8 w-auto mx-auto mb-4"
          priority
        />
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-rose-400 border-t-transparent mx-auto" />
      </div>
    </div>
  );
}
