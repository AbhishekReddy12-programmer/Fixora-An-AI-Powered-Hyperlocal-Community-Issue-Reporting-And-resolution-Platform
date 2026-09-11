'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, IssueResponse } from '@/lib/api-client';
import { ISSUE_CATEGORIES, ISSUE_STATUSES } from '@/lib/constants';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { DualProofCard } from '@/components/resolution/DualProofCard';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MemberDashboard() {
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'reports' | 'verify' | 'confirmations'>('reports');
  const [myReports, setMyReports] = useState<IssueResponse[]>([]);
  const [verifyFeed, setVerifyFeed] = useState<IssueResponse[]>([]);
  const [solvedPending, setSolvedPending] = useState<IssueResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [reportsData, feedData, nearbyData] = await Promise.all([
        api.get<IssueResponse[]>('/issues/my-reports').catch(() => []),
        api.get<IssueResponse[]>('/issues/verify-feed').catch(() => []),
        api.get<IssueResponse[]>('/issues/nearby?latitude=20.5937&longitude=78.9629&radius_meters=3000000').catch(() => []),
      ]);

      setMyReports(reportsData);
      setVerifyFeed(feedData);

      // Issues that are in RESOLVED state ready for community confirmation
      const solved = nearbyData.filter(i => i.status === 'RESOLVED');
      setSolvedPending(solved);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  const handleVerify = async (issueId: string, response: 'YES' | 'NO') => {
    setVerifyingId(issueId);
    setFeedbackMsg(null);
    try {
      await api.post(`/issues/${issueId}/verify`, {
        response,
        latitude: null,
        longitude: null,
      });

      setFeedbackMsg({
        type: 'success',
        text: response === 'YES' ? 'Vote registered! +15 Karma XP earned.' : 'Feedback recorded.',
      });

      // Remove from verify feed
      setVerifyFeed(prev => prev.filter(i => i.id !== issueId));
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Verification could not be processed.',
      });
    } finally {
      setVerifyingId(null);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center text-slate-400">
        Loading member workspace...
      </div>
    );
  }

  // Calculate tier
  const points = user?.karma_points || 0;
  const tier = points >= 1500 ? 'Civic Hero' : points >= 600 ? 'Community Champion' : points >= 200 ? 'Community Helper' : 'Civic Scout';
  const tierBadgeColor = points >= 1500 ? 'bg-amber-100 text-amber-900 border-amber-300' : points >= 600 ? 'bg-purple-100 text-purple-900 border-purple-300' : points >= 200 ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-emerald-100 text-emerald-900 border-emerald-300';

  return (
    <div className="min-h-screen fixora-bg-action text-[#0f172a] font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#fafaf8]/90 backdrop-blur-md border-b border-[#e8e8e4] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
              <span className="text-emerald-400">🛡️</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">
                Fixora
              </span>
              <span className="text-[10px] font-medium text-slate-500 tracking-wide mt-0.5">
                Member Workspace
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <Link
              href="/report"
              className="hidden sm:inline-flex bg-[#040f0c] hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm items-center gap-1.5"
            >
              <span>+</span>
              <span>Report Defect</span>
            </Link>
            <Link
              href="/leaderboard"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition px-2 py-1"
            >
              Leaderboard
            </Link>
            <button
              onClick={logout}
              className="text-xs text-slate-400 hover:text-red-600 font-medium transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* User Ribbon / Hero Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e8e8e4] shadow-[0_4px_30px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white flex items-center justify-center text-2xl sm:text-3xl font-black shadow-inner border border-slate-600">
              {user?.full_name?.charAt(0).toUpperCase() || 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {user?.full_name}
                </h1>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${tierBadgeColor}`}>
                  {tier}
                </span>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                  {user?.role || 'CITIZEN'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {user?.email || user?.phone || 'Verified Community Member'} • Ward: Metro Central
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-500 font-bold text-sm">{points}</span>
                  <span className="text-slate-500 font-medium">Karma XP</span>
                </div>
                <div className="text-slate-300">•</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold text-sm">{(user?.credibility_score || 50).toFixed(0)}%</span>
                  <span className="text-slate-500 font-medium">Credibility Rating</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/report"
              className="flex-1 sm:flex-none text-center bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-3 rounded-xl transition shadow-sm"
            >
              Report New Problem
            </Link>
            <Link
              href="/track"
              className="flex-1 sm:flex-none text-center bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-3 rounded-xl transition border border-slate-200"
            >
              Track by Code
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[#e8e8e4]">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              My Submissions
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-slate-900">{myReports.length}</span>
              <span className="text-xs text-slate-500">issues filed</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#e8e8e4]">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider block">
              Active / In-Review
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-amber-600">
                {myReports.filter(r => r.status !== 'RESOLVED' && r.status !== 'COMMUNITY_CONFIRMED' && r.status !== 'CLOSED').length}
              </span>
              <span className="text-xs text-slate-500">pending resolution</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#e8e8e4]">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block">
              Awaiting Your Vote
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-blue-600">{verifyFeed.length}</span>
              <span className="text-xs text-slate-500">neighbor reports</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#e8e8e4]">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">
              Dual-Proof Approvals
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-emerald-600">{solvedPending.length}</span>
              <span className="text-xs text-slate-500">fixes to confirm</span>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`p-4 rounded-2xl text-xs font-medium flex items-center justify-between border ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-700">
              ✕
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 flex gap-2 sm:gap-6 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-3 text-xs sm:text-sm font-bold transition whitespace-nowrap border-b-2 ${
              activeTab === 'reports'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            My Reports ({myReports.length})
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            className={`pb-3 text-xs sm:text-sm font-bold transition whitespace-nowrap border-b-2 ${
              activeTab === 'verify'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Issues to Verify ({verifyFeed.length})
          </button>
          <button
            onClick={() => setActiveTab('confirmations')}
            className={`pb-3 text-xs sm:text-sm font-bold transition whitespace-nowrap border-b-2 ${
              activeTab === 'confirmations'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Dual-Proof Sign-offs ({solvedPending.length})
          </button>
        </div>

        {/* Tab 1: My Reports */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading your reports...</div>
            ) : myReports.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-[#e8e8e4] max-w-lg mx-auto space-y-3">
                <span className="text-4xl">🌱</span>
                <h3 className="text-base font-bold text-slate-800">You haven't reported any issues yet</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Notice a pothole, broken streetlight, or garbage heap? Snap a photo and submit your first report to help clean up your neighborhood.
                </p>
                <div className="pt-2">
                  <Link
                    href="/report"
                    className="inline-flex bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition"
                  >
                    Report First Defect →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myReports.map(issue => {
                  const cat = ISSUE_CATEGORIES.find(c => c.value === issue.category);
                  const stat = ISSUE_STATUSES.find(s => s.value === issue.status);
                  return (
                    <div
                      key={issue.id}
                      className="bg-white rounded-2xl border border-[#e8e8e4] p-5 flex flex-col justify-between hover:shadow-md transition"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {issue.tracking_code}
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${stat?.color || '#94a3b8'}20`,
                              color: stat?.color || '#334155',
                            }}
                          >
                            {stat?.label || issue.status}
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-1">{issue.title}</h3>
                        <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                          {issue.description || 'No description provided.'}
                        </p>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-4">
                          <span>{cat?.icon} {cat?.label}</span>
                          <span>•</span>
                          <span>P{issue.severity}</span>
                          <span>•</span>
                          <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          <strong>{issue.verification_count}</strong> community votes
                        </span>
                        <Link
                          href={`/track?code=${issue.tracking_code}`}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                        >
                          View Status →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Issues to Verify */}
        {activeTab === 'verify' && (
          <div className="space-y-4">
            <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-900 flex items-center justify-between">
              <div>
                <span className="font-bold">Neighborhood Verification Hub:</span> Verify whether defects reported by your neighbors are legitimate. You earn <strong>+15 Karma XP</strong> for each valid verification.
              </div>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading issues to verify...</div>
            ) : verifyFeed.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-[#e8e8e4] max-w-lg mx-auto space-y-2">
                <span className="text-4xl">🎉</span>
                <h3 className="text-base font-bold text-slate-800">All caught up!</h3>
                <p className="text-xs text-slate-500">
                  There are currently no new neighbor reports pending verification in your ward.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {verifyFeed.map(issue => {
                  const cat = ISSUE_CATEGORIES.find(c => c.value === issue.category);
                  return (
                    <div
                      key={issue.id}
                      className="bg-white rounded-2xl border border-[#e8e8e4] p-5 flex flex-col justify-between hover:border-slate-300 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {issue.tracking_code}
                          </span>
                          <span className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Needs Verification
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-900 text-sm mb-1">{issue.title}</h3>
                        <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                          {issue.description || 'Defect reported by citizen.'}
                        </p>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-4">
                          <span>{cat?.icon} {cat?.label}</span>
                          <span>•</span>
                          <span>{issue.address_text || 'GPS Location'}</span>
                        </div>

                        {issue.before_image_url && (
                          <div className="relative h-40 w-full rounded-xl overflow-hidden bg-slate-100 mb-4 border border-slate-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={issue.before_image_url}
                              alt={issue.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>

                      {/* 1-Click Verification Buttons */}
                      <div className="pt-3 border-t border-slate-100 flex gap-2">
                        <button
                          onClick={() => handleVerify(issue.id, 'YES')}
                          disabled={verifyingId === issue.id}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <span>✓</span>
                          <span>Confirm Problem</span>
                        </button>
                        <button
                          onClick={() => handleVerify(issue.id, 'NO')}
                          disabled={verifyingId === issue.id}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs transition disabled:opacity-50"
                        >
                          Cannot Confirm
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Dual-Proof Sign-offs */}
        {activeTab === 'confirmations' && (
          <div className="space-y-4">
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 flex items-center justify-between">
              <div>
                <span className="font-bold">Dual-Proof Confirmation Engine:</span> When the municipal crew marks an issue as solved with photo proof, citizens inspect the fix. If the repair is inadequate, disputing it immediately reopens the complaint.
              </div>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading resolutions...</div>
            ) : solvedPending.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-[#e8e8e4] max-w-lg mx-auto space-y-2">
                <span className="text-4xl">🛡️</span>
                <h3 className="text-base font-bold text-slate-800">No Pending Confirmations</h3>
                <p className="text-xs text-slate-500">
                  There are currently no newly resolved municipal repairs waiting for citizen sign-off.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {solvedPending.map(issue => (
                  <div key={issue.id} className="bg-white rounded-2xl border border-[#e8e8e4] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {issue.tracking_code}
                      </span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Work Complete
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base">{issue.title}</h3>

                    <DualProofCard
                      issue={issue}
                      onConfirmed={() => {
                        setFeedbackMsg({ type: 'success', text: 'Resolution confirmed! Thank you.' });
                        loadDashboardData();
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
