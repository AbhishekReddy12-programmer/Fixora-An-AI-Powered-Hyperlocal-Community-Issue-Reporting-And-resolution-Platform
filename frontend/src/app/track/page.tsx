'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { api, IssueResponse } from '@/lib/api-client';
import { ISSUE_CATEGORIES, ISSUE_STATUSES, SEVERITY_LABELS } from '@/lib/constants';
import { DualProofCard } from '@/components/resolution/DualProofCard';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const LeafletMiniMap = dynamic(
  () => import('@/components/map/LeafletMiniMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-44 rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-400 animate-pulse">
        Loading defect map...
      </div>
    ),
  }
);

function TrackContent() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [issue, setIssue] = useState<IssueResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentIssues, setRecentIssues] = useState<IssueResponse[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  const fetchIssue = async (trackingCode: string) => {
    if (!trackingCode.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await api.get<IssueResponse>(`/issues/track/${trackingCode.trim()}`);
      setIssue(data);
    } catch (err: any) {
      setError(err.message || 'Issue not found with that code.');
      setIssue(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadRecent = async () => {
      setIsLoadingList(true);
      try {
        const list = await api.get<IssueResponse[]>('/issues/recent?limit=30');
        setRecentIssues(list || []);
      } catch (err) {
        console.warn('Could not fetch recent issues:', err);
      } finally {
        setIsLoadingList(false);
      }
    };
    loadRecent();
  }, []);

  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setCode(codeParam);
      fetchIssue(codeParam);
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIssue(code);
  };

  const handleSelectIssue = (selectedCode: string) => {
    if (!selectedCode) return;
    setCode(selectedCode);
    fetchIssue(selectedCode);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/track?code=${selectedCode}`);
    }
  };

  return (
    <div className="min-h-screen fixora-bg-action flex flex-col font-sans">
      <header className="p-4 bg-white shadow-sm flex justify-between items-center px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-900 text-lg">
            ←
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Track Community Issue</h1>
        </div>

        <NotificationBell />
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto p-4 space-y-4">
        {/* Search Bar & Dropdown Picker */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Track by Code
            </label>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. FIXORA-BD678C"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm uppercase"
              />
              <button
                type="submit"
                disabled={isLoading || !code.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </form>
          </div>

          {/* Dropdown Selector for All Reports */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                <span>📋</span>
                <span>Or Select from Reported Issues</span>
              </label>
              {recentIssues.length > 0 && (
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {recentIssues.length} reports
                </span>
              )}
            </div>

            <div className="relative">
              <select
                value={issue?.tracking_code || ''}
                onChange={e => handleSelectIssue(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100/70 border border-gray-200 rounded-xl text-xs text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer appearance-none pr-8"
              >
                <option value="">
                  {isLoadingList
                    ? 'Loading reported issues...'
                    : recentIssues.length === 0
                    ? 'No issues available yet'
                    : '▼ Choose a report to track immediately...'}
                </option>
                {recentIssues.map(item => (
                  <option key={item.id} value={item.tracking_code}>
                    [{item.tracking_code}] {item.title} ({item.status})
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
                ▼
              </div>
            </div>

            {/* Quick Click Badges */}
            {recentIssues.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-gray-400 font-medium mr-1">Recent:</span>
                {recentIssues.slice(0, 4).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectIssue(item.tracking_code)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-mono border transition-all cursor-pointer ${
                      code === item.tracking_code
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {item.tracking_code}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-red-600 text-xs bg-red-50 p-2.5 rounded-lg">{error}</p>}
        </div>

        {/* Issue Details Card */}
        {issue && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="font-mono text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                  {issue.tracking_code}
                </span>
                <h2 className="text-lg font-bold text-gray-900 mt-1">{issue.title}</h2>
                <p className="text-xs text-gray-400">
                  Reported on {new Date(issue.created_at).toLocaleDateString()}
                </p>
              </div>

              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: `${ISSUE_STATUSES.find(s => s.value === issue.status)?.color}1A`,
                  color: ISSUE_STATUSES.find(s => s.value === issue.status)?.color,
                }}
              >
                {issue.status}
              </span>
            </div>

            {issue.before_image_url && (
              <img
                src={issue.before_image_url.startsWith('http') ? issue.before_image_url : `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, '') || 'http://localhost:8000'}${issue.before_image_url.startsWith('/') ? '' : '/'}${issue.before_image_url}`}
                alt="Reported defect"
                className="w-full h-56 object-cover rounded-xl border border-gray-100"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=60';
                }}
              />
            )}

            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3.5 rounded-xl">
              <div>
                <span className="text-gray-400 block">Category</span>
                <span className="font-semibold text-gray-800">
                  {ISSUE_CATEGORIES.find(c => c.value === issue.category)?.icon}{' '}
                  {ISSUE_CATEGORIES.find(c => c.value === issue.category)?.label || issue.category}
                </span>
              </div>

              <div>
                <span className="text-gray-400 block">Severity Level</span>
                <span className="font-semibold text-gray-800">
                  P{issue.severity} • {SEVERITY_LABELS.find(s => s.level === issue.severity)?.label}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-gray-400 block mb-0.5">Location</span>
                <span className="font-semibold text-gray-800 block mb-2">
                  {issue.address_text || 'GPS Pinned on Map'}
                </span>
                {typeof issue.latitude === 'number' && typeof issue.longitude === 'number' && (
                  <div className="mt-1">
                    <LeafletMiniMap
                      latitude={issue.latitude}
                      longitude={issue.longitude}
                      category={issue.category}
                      status={issue.status}
                      addressText={issue.address_text}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Dual-Proof Card (Only when marked RESOLVED by admin) */}
            <DualProofCard issue={issue} onConfirmed={updated => setIssue(updated)} />

            {/* Verification Stats */}
            <div className="border-t border-gray-100 pt-3 flex justify-between text-xs text-gray-500">
              <span>
                Community Confirmations: <strong className="text-blue-600">{issue.verification_count}</strong>
              </span>
              <span>
                Consensus Confidence:{' '}
                <strong className="text-green-600">{issue.confidence_score.toFixed(0)}%</strong>
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Track() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-gray-500">
          Loading issue tracker...
        </div>
      }
    >
      <TrackContent />
    </Suspense>
  );
}

