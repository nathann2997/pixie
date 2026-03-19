"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useFirebase } from '@/components/providers/firebase-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useFirebase();

  useEffect(() => {
    if (user) router.push('/dashboard');
  }, [user, router]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push('/dashboard');
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Authentication failed';
      if (raw.includes('user-not-found') || raw.includes('wrong-password') || raw.includes('invalid-credential')) {
        setError('Incorrect email or password. Please try again.');
      } else if (raw.includes('email-already-in-use')) {
        setError('An account with this email already exists. Try signing in.');
      } else if (raw.includes('weak-password')) {
        setError('Password must be at least 6 characters.');
      } else if (raw.includes('network-request-failed')) {
        setError('Network error — please check your connection and try again.');
      } else {
        setError(raw);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Google sign-in failed';
      if (raw.includes('popup-closed-by-user')) {
        // User dismissed — not an error worth showing
      } else if (raw.includes('network-request-failed')) {
        setError('Network error — please check your connection and try again.');
      } else {
        setError(raw);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/pigxel.jpg"
            alt="Pigxel"
            width={120}
            height={40}
            className="object-contain h-10 w-auto mb-5"
            priority
          />
          <p className="text-sm text-slate-500 mb-4 text-center max-w-xs leading-relaxed">
            One script. Every pixel. Zero conflicts.
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1.5">
            {isSignUp ? 'Get started free' : 'Welcome back'}
          </h1>
          <p className="text-sm text-slate-500 text-center">
            {isSignUp
              ? 'Manage all your marketing tracking pixels from one dashboard.'
              : 'Sign in to open your Pigxel workspace.'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
          {/* Google Sign-In */}
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium h-10 shadow"
          >
            <svg className="mr-2.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">or use email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Email / Password form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 h-10"
              />
              {isSignUp && (
                <p className="text-xs text-slate-400 mt-1">Must be at least 6 characters</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-400 hover:bg-rose-500 text-white font-medium h-10 shadow-sm transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {isSignUp ? 'Creating workspace…' : 'Signing in…'}
                </span>
              ) : (
                isSignUp ? 'Create workspace' : 'Sign in'
              )}
            </Button>
          </form>
        </div>

        {/* Toggle sign-up/sign-in */}
        <p className="text-center text-sm text-slate-500 mt-5">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            disabled={loading}
            className="text-rose-500 hover:text-rose-600 font-medium transition-colors"
          >
            {isSignUp ? 'Sign in' : 'Sign up free'}
          </button>
        </p>

        <p className="text-center text-xs text-slate-400 mt-6">
          Free to start · No credit card required
        </p>
      </div>
    </div>
  );
}
