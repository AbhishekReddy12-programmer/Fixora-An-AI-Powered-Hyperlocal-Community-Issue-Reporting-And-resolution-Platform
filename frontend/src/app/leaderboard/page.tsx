'use client';

import React, { useState, useEffect } from 'react';
import { api, LeaderboardResponse } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const res = await api.get<LeaderboardResponse>('/gamification/leaderboard?limit=25');
        setData(res);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBoard();
  }, []);

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'Civic Hero':
        return '👑 Civic Hero';
      case 'Community Champion':
        return '⭐ Champion';
      case 'Community Helper':
        return '🛡️ Helper';
      default:
        return '🌱 Scout';
    }
  };

  return (
    <div className="min-h-screen fixora-bg-action flex flex-col font-sans">
      {/* Header */}
      <header className="p-4 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-800 text-lg">
            ←
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Community Leaderboard</h1>
            <p className="text-xs text-gray-500">{data?.ward_name || 'Neighborhood Ward'}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-4">
        {/* User's Current Standing Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs text-blue-200 block font-medium">YOUR STANDING</span>
            <h2 className="text-xl font-bold mt-0.5">{user?.full_name || 'You'}</h2>
            <span className="text-xs text-blue-100 mt-1 inline-block bg-white/20 px-2 py-0.5 rounded-full">
              Rank #{data?.user_rank ?? '-'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-3xl font-extrabold">{data?.user_points ?? 0}</span>
            <span className="text-xs text-blue-200 block font-medium">Karma XP</span>
          </div>
        </div>

        {/* Tiers Information Card */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-xs text-gray-600 flex justify-between gap-2 overflow-x-auto">
          <div className="text-center shrink-0">
            <span className="font-bold text-gray-800 block">🌱 Scout</span>
            <span>0-199 XP</span>
          </div>
          <div className="text-center shrink-0">
            <span className="font-bold text-gray-800 block">🛡️ Helper</span>
            <span>200-599 XP</span>
          </div>
          <div className="text-center shrink-0">
            <span className="font-bold text-gray-800 block">⭐ Champion</span>
            <span>600-1499 XP</span>
          </div>
          <div className="text-center shrink-0">
            <span className="font-bold text-gray-800 block">👑 Civic Hero</span>
            <span>1500+ XP</span>
          </div>
        </div>

        {/* Ranked Members List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <span className="text-xs font-semibold text-gray-500 uppercase">Top Contributors</span>
            <span className="text-xs font-medium text-gray-400">Quality-Based Points</span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading standings...</div>
          ) : !data || data.leaderboard.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No community points recorded yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.leaderboard.map((item, index) => {
                const isCurrentUser = user && user.full_name === item.full_name;
                return (
                  <div
                    key={item.user_id}
                    className={`p-4 flex items-center justify-between ${
                      isCurrentUser ? 'bg-blue-50/50 font-semibold' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : index === 1
                            ? 'bg-slate-200 text-slate-800'
                            : index === 2
                            ? 'bg-orange-100 text-orange-800'
                            : 'text-gray-500'
                        }`}
                      >
                        {item.rank}
                      </span>

                      <div>
                        <span className="text-sm text-gray-900 block">{item.full_name}</span>
                        <span className="text-[11px] text-gray-500">{getTierBadge(item.tier)}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900 block">{item.points}</span>
                      <span className="text-[10px] text-gray-400">points</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
