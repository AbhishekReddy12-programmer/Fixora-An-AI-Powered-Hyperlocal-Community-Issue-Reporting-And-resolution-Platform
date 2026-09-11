'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(username, password);
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.role === 'MUNICIPAL_ADMIN' || payload.role === 'SUPER_ADMIN') {
            router.push('/admin');
            return;
          }
        } catch {
          // fallback
        }
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Incorrect credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen fixora-bg-action flex flex-col justify-between p-4 sm:p-6 font-sans text-slate-900">
      {/* Top Header */}
      <div className="max-w-md w-full mx-auto pt-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
            <span className="text-emerald-400">🛡️</span>
          </div>
          <span className="font-extrabold tracking-tight text-slate-900 text-lg">Fixora</span>
        </Link>
        <Link
          href="/"
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          Back to Live Map →
        </Link>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto bg-white rounded-3xl p-8 sm:p-10 border border-[#e8e8e4] shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            Secure Civic Portal
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mb-2">
          Welcome back
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Sign in to report defects, confirm community resolutions, or manage municipal operations.
        </p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl mb-6 text-xs flex items-center gap-2 font-medium">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Email or Phone Number
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              placeholder="e.g. citizen@fixora.org or +1234567890"
              className="w-full px-4 py-3 bg-[#fafaf8] border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password
              </label>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-[#fafaf8] border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-[#040f0c] hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition duration-200 disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Fixora →</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-3">
          <p className="text-xs text-slate-500">
            Don't have a Fixora account?{' '}
            <Link href="/register" className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline">
              Create citizen account
            </Link>
          </p>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 w-full text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-700">Role-Aware Access:</span> Municipal administrators are automatically routed to the Command Center upon login.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto pb-6 text-center text-xs text-slate-400">
        © 2024 Fixora Hyperlocal Platform. Verified Civic Action.
      </div>
    </div>
  );
}
