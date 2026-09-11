'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { api, IssueNearbyResponse, IssueResponse } from '@/lib/api-client';
import { ISSUE_CATEGORIES, ISSUE_STATUSES } from '@/lib/constants';
import Link from 'next/link';

// Dynamically import Leaflet map with SSR turned off
const LeafletCityMap = dynamic(
  () => import('@/components/map/LeafletCityMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-80 rounded-2xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
        Loading interactive civic map...
      </div>
    ),
  }
);

export default function Explore() {
  const [issues, setIssues] = useState<IssueNearbyResponse[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<IssueResponse | null>(null);
  const [userCoords, setUserCoords] = useState<[number, number]>([20.5937, 78.9629]);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDefaultIssues = () => {
      api
        .get<IssueNearbyResponse[]>('/issues/nearby?latitude=20.5937&longitude=78.9629&radius_meters=3000000')
        .then((data) => setIssues(data))
        .catch(() => setError('Could not load nearby issues.'))
        .finally(() => setIsLoading(false));
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserCoords([lat, lng]);
          try {
            const data = await api.get<IssueNearbyResponse[]>(
              `/issues/nearby?latitude=${lat}&longitude=${lng}&radius_meters=10000`
            );
            setIssues(data);
          } catch (err: any) {
            setError('Failed to fetch nearby issues.');
          } finally {
            setIsLoading(false);
          }
        },
        () => {
          loadDefaultIssues();
        },
        { timeout: 5000, enableHighAccuracy: false, maximumAge: 60000 }
      );
    } else {
      loadDefaultIssues();
    }
  }, []);

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="min-h-screen fixora-bg-action text-[#0f172a] font-sans antialiased flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#e8e8e4] px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-slate-900 font-bold transition">
              ←
            </Link>
            <div>
              <h1 className="text-lg font-black text-slate-900 leading-tight">Civic Defect Map</h1>
              <p className="text-xs text-slate-500">Live geo-tagged community issues powered by Leaflet & OpenStreetMap</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* View Switcher */}
            <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'map' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                🗺️ Map View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                📋 List View
              </button>
            </div>

            <Link
              href="/report"
              className="hidden sm:inline-flex bg-[#040f0c] hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-sm"
            >
              + Report Defect
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-4 flex flex-col">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        {/* Map View */}
        {viewMode === 'map' && (
          <div className="flex-1 flex flex-col space-y-3 min-h-[480px]">
            {/* Status Legend Bar */}
            <div className="bg-white rounded-2xl border border-[#e8e8e4] px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-4 flex-wrap font-medium text-slate-600">
                <span className="font-bold text-slate-900 text-xs">Map Status Legend:</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                  <span>Assigned</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-purple-600"></span>
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                  <span>Resolved</span>
                </div>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">{issues.length} active pins</span>
            </div>

            {/* The Actual Leaflet Map Canvas */}
            <div className="flex-1 w-full h-[520px] rounded-3xl overflow-hidden shadow-sm border border-[#e8e8e4]">
              <LeafletCityMap
                issues={issues}
                selectedIssue={selectedIssue}
                onSelectIssue={setSelectedIssue}
                center={userCoords}
              />
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {isLoading && (
              <div className="py-24 text-center text-slate-400 text-xs">
                Scanning for neighborhood defect reports...
              </div>
            )}

            {!isLoading && !error && issues.length === 0 && (
              <div className="bg-white p-12 text-center rounded-3xl border border-[#e8e8e4] max-w-md mx-auto space-y-2">
                <span className="text-4xl block mb-2">🌟</span>
                <h2 className="text-base font-bold text-slate-900">No issues found nearby</h2>
                <p className="text-xs text-slate-500">Your area currently has zero unverified reports.</p>
              </div>
            )}

            {!isLoading && issues.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {issues.map(issue => {
                  const cat = ISSUE_CATEGORIES.find(c => c.value === issue.category);
                  const stat = ISSUE_STATUSES.find(s => s.value === issue.status);
                  return (
                    <Link
                      key={issue.id}
                      href={`/track?code=${issue.tracking_code}`}
                      className="bg-white p-5 rounded-2xl border border-[#e8e8e4] hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {issue.tracking_code}
                          </span>
                          <span className="text-xs font-bold text-emerald-600 ml-3">
                            {formatDistance(issue.distance_meters)} away
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-1">{issue.title}</h3>
                        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{issue.description || 'Defect reported by citizen.'}</p>

                        <div className="flex items-center gap-2 mb-4 text-[11px] text-slate-400">
                          <span>{cat?.icon} {cat?.label || issue.category}</span>
                          <span>•</span>
                          <span>P{issue.severity}</span>
                          <span>•</span>
                          <span>{issue.address_text || 'GPS Location'}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                        <span
                          className="px-2.5 py-0.5 rounded-full font-bold text-[10px]"
                          style={{
                            backgroundColor: `${stat?.color || '#64748b'}20`,
                            color: stat?.color || '#334155',
                          }}
                        >
                          {stat?.label || issue.status}
                        </span>
                        <span className="text-slate-400 text-[11px]">{formatTimeAgo(issue.created_at)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
