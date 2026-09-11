'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phone) {
      setError('At least one of email or phone is required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await register({
        full_name: fullName,
        email: email || undefined,
        phone: phone || undefined,
        password,
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
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

      {/* Main Register Card */}
      <div className="max-w-md w-full mx-auto my-auto bg-white rounded-3xl p-8 sm:p-10 border border-[#e8e8e4] shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            Join the Civic Network
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mb-2">
          Create account
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Report neighborhood defects, earn Karma XP, and confirm municipal repairs.
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
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              placeholder="e.g. Maya Lin"
              className="w-full px-4 py-3 bg-[#fafaf8] border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Email Address <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="maya@example.com"
              className="w-full px-4 py-3 bg-[#fafaf8] border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Phone Number <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 (555) 019-2834"
              className="w-full px-4 py-3 bg-[#fafaf8] border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              * Provide at least one: email or phone number.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Minimum 8 characters"
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
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create Account & Join →</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Already registered on Fixora?{' '}
            <Link href="/login" className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto pb-6 text-center text-xs text-slate-400">
        © 2024 Fixora Hyperlocal Platform. Verified Civic Action.
      </div>
    </div>
  );
}
