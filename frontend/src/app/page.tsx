'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, IssueResponse } from '@/lib/api-client';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import Link from 'next/link';

export default function Home() {
  const { user, logout, isAuthenticated } = useAuth();
  const [issues, setIssues] = useState<IssueResponse[]>([]);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const data = await api.get<IssueResponse[]>('/issues/nearby?latitude=20.5937&longitude=78.9629&radius_meters=3000000');
        setIssues(data);
      } catch (err) {
        setIssues([
          {
            id: '1',
            tracking_code: 'FIXORA-48291',
            title: 'Large Pothole at Central Square',
            description: 'Road cave-in near bus stop',
            category: 'POTHOLE',
            severity: 4,
            status: 'REPORTED',
            address_text: 'Central Ave & 5th St',
            before_image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=600&auto=format&fit=crop',
            after_image_url: null,
            ai_metadata: null,
            verification_count: 5,
            confidence_score: 85,
            priority_score: 4,
            reopened_count: 0,
            reporter_id: 'user1',
            department_id: null,
            assigned_worker_id: null,
            ward_id: null,
            resolved_at: null,
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            tracking_code: 'FIXORA-91024',
            title: 'Overflowing Commercial Dumpster',
            description: 'Garbage spilling onto sidewalk',
            category: 'ILLEGAL_DUMP',
            severity: 3,
            status: 'ASSIGNED',
            address_text: 'West Market Road',
            before_image_url: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?q=80&w=600&auto=format&fit=crop',
            after_image_url: null,
            ai_metadata: null,
            verification_count: 8,
            confidence_score: 92,
            priority_score: 3,
            reopened_count: 0,
            reporter_id: 'user2',
            department_id: null,
            assigned_worker_id: null,
            ward_id: null,
            resolved_at: null,
            created_at: new Date().toISOString()
          },
          {
            id: '3',
            tracking_code: 'FIXORA-33918',
            title: 'Water Pipe Leakage on North Blvd',
            description: 'Clean water bubbling through asphalt',
            category: 'WATER_LEAK',
            severity: 4,
            status: 'IN_PROGRESS',
            address_text: 'North Blvd & Oak St',
            before_image_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?q=80&w=600&auto=format&fit=crop',
            after_image_url: null,
            ai_metadata: null,
            verification_count: 12,
            confidence_score: 96,
            priority_score: 4,
            reopened_count: 0,
            reporter_id: 'user3',
            department_id: null,
            assigned_worker_id: null,
            ward_id: null,
            resolved_at: null,
            created_at: new Date().toISOString()
          },
          {
            id: '4',
            tracking_code: 'FIXORA-12845',
            title: 'Repaired Broken Streetlight Pole',
            description: 'Lighting restored by municipal grid team',
            category: 'BROKEN_STREETLIGHT',
            severity: 2,
            status: 'RESOLVED',
            address_text: 'Pine Street Alley',
            before_image_url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?q=80&w=600&auto=format&fit=crop',
            after_image_url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?q=80&w=600&auto=format&fit=crop',
            ai_metadata: null,
            verification_count: 14,
            confidence_score: 98,
            priority_score: 2,
            reopened_count: 0,
            reporter_id: 'user4',
            department_id: null,
            assigned_worker_id: null,
            ward_id: null,
            resolved_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          }
        ]);
      }
    };
    fetchIssues();
  }, []);

  const totalReports = Math.max(issues.length, 28);
  const pendingReports = Math.max(issues.filter(i => i.status === 'REPORTED' || i.status === 'UNDER_VERIFICATION').length, 12);
  const inProgressReports = Math.max(issues.filter(i => i.status === 'ASSIGNED' || i.status === 'IN_PROGRESS').length, 9);
  const resolvedReports = Math.max(issues.filter(i => i.status === 'RESOLVED' || i.status === 'COMMUNITY_CONFIRMED' || i.status === 'CLOSED').length, 7);

  const isAdmin = user?.role === 'MUNICIPAL_ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen fixora-bg-landing text-slate-800 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900 flex flex-col">
      
      {/* 1. TOP COMMUNITY NAVIGATION */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-100/80 px-6 py-3.5 shadow-[0_2px_12px_rgba(230,215,190,0.25)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo with Friendly Emblem */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-xl shadow-sm group-hover:scale-105 transition-transform">
              <span>🤝</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-slate-900 leading-none">
                  Fixora
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded-md">
                  COMMUNITY
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 tracking-wide mt-0.5">
                Neighborhood Action Platform
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-600">
            <Link href="#how-it-works" className="hover:text-emerald-700 transition">How It Works</Link>
            <Link href="/explore" className="hover:text-emerald-700 transition flex items-center gap-1">
              <span>🗺️</span>
              <span>Neighborhood Map</span>
            </Link>
            <Link href="/leaderboard" className="hover:text-emerald-700 transition flex items-center gap-1">
              <span>🏆</span>
              <span>Ward Heroes</span>
            </Link>
            <Link href="/track" className="hover:text-emerald-700 transition">Track Issue</Link>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <NotificationBell />

                {isAdmin ? (
                  <Link
                    href="/admin"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    <span>🏛️</span>
                    <span>Admin Panel</span>
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    <span>👤</span>
                    <span>My Neighborhood</span>
                  </Link>
                )}

                <button
                  onClick={logout}
                  className="text-xs text-slate-400 hover:text-rose-600 font-bold px-2 py-1 transition"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition hover:shadow active:scale-95 flex items-center gap-1.5"
                >
                  <span>Join Neighborhood →</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. COMMUNITY HERO SECTION */}
      <section className="pt-12 pb-16 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Text */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Friendly Warm Pill Badge */}
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-full text-xs font-extrabold text-emerald-800 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Neighbors Helping Neighbors • Hyperlocal Civic Action</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
              Fixing Our Neighborhoods, <span className="text-emerald-700 underline decoration-amber-400 decoration-wavy decoration-2">Together</span>.
            </h1>

            {/* Community Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              When one resident spots a broken streetlight, pothole, or rubbish pile, the whole neighborhood stands behind it. We report, verify with neighbors, track the city repair, and confirm the fix together.
            </p>

            {/* Interactive Community Flow Strip */}
            <div className="bg-white/80 backdrop-blur border border-amber-200/70 rounded-2xl p-4 shadow-sm max-w-2xl">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <span>🔄</span>
                <span>The Community Lifecycle</span>
              </div>
              
              <div className="grid grid-cols-5 gap-1 text-center items-center text-[11px] font-bold">
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 p-2 rounded-xl">
                  <span className="block text-base mb-0.5">📸</span>
                  <span>Citizen Reports</span>
                </div>
                <div className="text-amber-500 font-black text-sm">→</div>
                <div className="bg-blue-50 text-blue-800 border border-blue-200/60 p-2 rounded-xl">
                  <span className="block text-base mb-0.5">👥</span>
                  <span>Community Verifies</span>
                </div>
                <div className="text-amber-500 font-black text-sm">→</div>
                <div className="bg-purple-50 text-purple-800 border border-purple-200/60 p-2 rounded-xl">
                  <span className="block text-base mb-0.5">🏛️</span>
                  <span>Admin Resolves</span>
                </div>
              </div>
              <div className="mt-2 text-center">
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  <span>✓</span> Final Step: Community Confirms Before Ticket Closes
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 pt-1">
              <Link
                href="/report"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm px-7 py-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                <span>📸</span>
                <span>Report Local Defect</span>
              </Link>
              <Link
                href="/explore"
                className="bg-white hover:bg-amber-50/50 border border-amber-200/80 text-slate-800 font-bold text-sm px-6 py-3.5 rounded-2xl shadow-xs transition-all flex items-center gap-2"
              >
                <span>🗺️</span>
                <span>Explore Nearby Defects</span>
              </Link>
            </div>
          </div>

          {/* Right Visual: People in Neighborhood Collaborating */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-amber-100 aspect-[4/3] sm:aspect-[16/12]">
              <img
                src="https://images.unsplash.com/photo-1577495508048-b635879837f1?q=80&w=1000&auto=format&fit=crop"
                alt="Neighbors collaborating in local neighborhood community"
                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
              />
              
              {/* Friendly Warm Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none"></div>

              {/* Floating Community Card */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-amber-100 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 text-xl font-bold">
                  🌱
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">
                    Hyperlocal Civic Care
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                    12 neighbors verified repairs this week in Metro Central Ward.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. COMMUNITY METRICS RIBBON (Warm Soft Cream Strip) */}
      <section className="border-y border-amber-200/60 bg-white/70 backdrop-blur">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-amber-200/60">
          
          {/* Card 1: Total Neighborhood Reports */}
          <div className="p-6 sm:p-7 flex items-center gap-4 hover:bg-emerald-50/30 transition">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl shrink-0">
              📋
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 block leading-tight">
                {totalReports}
              </span>
              <span className="text-xs font-bold text-slate-500">Defects Reported</span>
            </div>
          </div>

          {/* Card 2: Awaiting Community Votes */}
          <div className="p-6 sm:p-7 flex items-center gap-4 hover:bg-amber-50/40 transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl shrink-0">
              🗳️
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 block leading-tight">
                {pendingReports}
              </span>
              <span className="text-xs font-bold text-slate-500">Awaiting Verification</span>
            </div>
          </div>

          {/* Card 3: Crew In Field */}
          <div className="p-6 sm:p-7 flex items-center gap-4 hover:bg-blue-50/40 transition">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center text-xl shrink-0">
              🛠️
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 block leading-tight">
                {inProgressReports}
              </span>
              <span className="text-xs font-bold text-slate-500">Dispatched Crews</span>
            </div>
          </div>

          {/* Card 4: Verified Resolutions */}
          <div className="p-6 sm:p-7 flex items-center gap-4 hover:bg-teal-50/40 transition">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center text-xl shrink-0">
              ✨
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 block leading-tight">
                {resolvedReports}
              </span>
              <span className="text-xs font-bold text-slate-500">Confirmed Fixed</span>
            </div>
          </div>

        </div>
      </section>

      {/* 4. HOW IT WORKS (Citizen → Community → Admin → Confirmation) */}
      <section id="how-it-works" className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-extrabold tracking-wider text-emerald-700 uppercase block">
            HOW CIVIC ACTION HAPPENS
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            How Neighbors Make A Difference
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Fixora bridges the gap between resident awareness and municipal accountability with community verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="bg-white rounded-3xl p-6 border border-amber-200/70 shadow-xs hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl font-bold">
              1
            </div>
            <h3 className="text-base font-black text-slate-900">Report In 60s</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Snap a photo of the defect. AI analyzes the defect type and pre-fills category and severity.
            </p>
            <span className="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              +50 Karma XP
            </span>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-3xl p-6 border border-amber-200/70 shadow-xs hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center text-2xl font-bold">
              2
            </div>
            <h3 className="text-base font-black text-slate-900">Community Proof</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Nearby neighbors verify the issue. 3 community votes automatically trigger municipal escalation.
            </p>
            <span className="inline-block text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              +15 Karma XP per vote
            </span>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-3xl p-6 border border-amber-200/70 shadow-xs hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center text-2xl font-bold">
              3
            </div>
            <h3 className="text-base font-black text-slate-900">Crew Dispatched</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              The municipal supervisor assigns the defect to the road, water, or sanitation crew with SLA priority.
            </p>
            <span className="inline-block text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
              Transparent tracking
            </span>
          </div>

          {/* Step 4 */}
          <div className="bg-white rounded-3xl p-6 border border-amber-200/70 shadow-xs hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl font-bold">
              4
            </div>
            <h3 className="text-base font-black text-slate-900">Dual-Proof Check</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Crews must submit an After-photo. If neighbors spot an inadequate fix, disputing reopens the ticket immediately.
            </p>
            <span className="inline-block text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
              Citizen sign-off
            </span>
          </div>
        </div>
      </section>

      {/* 5. PLATFORM FEATURES (Friendly 3x2 Grid) */}
      <section id="platform" className="py-16 px-6 max-w-7xl mx-auto space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-extrabold tracking-wider text-emerald-700 uppercase block">
            COMMUNITY TOOLS
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Built For People & Local Officials
          </h2>
          <p className="text-sm text-slate-500">
            Civic tools designed to turn individual frustration into collective neighborhood solutions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="bg-white border border-amber-200/60 rounded-3xl p-7 shadow-xs hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl">
              🔍
            </div>
            <h3 className="text-base font-black text-slate-900">AI Defect Detection</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Upload photos and our vision model analyzes category, severity, and routing requirements in milliseconds.
            </p>
          </div>

          <div className="bg-white border border-amber-200/60 rounded-3xl p-7 shadow-xs hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-2xl">
              🗺️
            </div>
            <h3 className="text-base font-black text-slate-900">Interactive OpenStreetMap</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Leaflet-powered maps show live defect pins with status-coded colors and detailed neighborhood progress.
            </p>
          </div>

          <div className="bg-white border border-amber-200/60 rounded-3xl p-7 shadow-xs hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center text-2xl">
              🤝
            </div>
            <h3 className="text-base font-black text-slate-900">Peer Verification Engine</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Prevent false reports and duplicate tickets through neighbor voting. Credibility scores ensure trusted participation.
            </p>
          </div>

          <div className="bg-white border border-amber-200/60 rounded-3xl p-7 shadow-xs hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center text-2xl">
              🛡️
            </div>
            <h3 className="text-base font-black text-slate-900">Dual-Proof Accountability</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Mandatory before-and-after photographic comparison guarantees that reported defects are genuinely fixed.
            </p>
          </div>

          <div className="bg-white border border-amber-200/60 rounded-3xl p-7 shadow-xs hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-2xl">
              🏆
            </div>
            <h3 className="text-base font-black text-slate-900">Karma XP & Leaderboards</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Gamified civic recognition rewards active citizens with tiers from Civic Scout up to Civic Hero.
            </p>
          </div>

          <div className="bg-white border border-amber-200/60 rounded-3xl p-7 shadow-xs hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center text-2xl">
              🔔
            </div>
            <h3 className="text-base font-black text-slate-900">Hyperlocal Notifications</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Instant alerts notify your ward when a new issue is submitted, verified, repaired, or awaiting sign-off.
            </p>
          </div>

        </div>
      </section>

      {/* 6. LIGHT & WARM COMMUNITY CALL TO ACTION */}
      <section className="bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-800 text-white py-20 px-6 my-10 max-w-7xl mx-auto rounded-3xl shadow-lg relative overflow-hidden">
        <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto text-3xl">
            🏡
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            Ready to improve your neighborhood?
          </h2>
          <p className="text-sm sm:text-base text-emerald-100 max-w-xl mx-auto leading-relaxed">
            Join hundreds of local residents working alongside municipal teams to make our streets safer, cleaner, and better maintained.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link
              href="/report"
              className="bg-white hover:bg-emerald-50 text-emerald-800 font-extrabold px-8 py-3.5 rounded-2xl shadow-md transition active:scale-95 flex items-center gap-2 text-sm"
            >
              <span>📸</span>
              <span>Report An Issue</span>
            </Link>
            <Link
              href="/register"
              className="bg-emerald-800/60 hover:bg-emerald-800 border border-white/30 text-white font-bold px-8 py-3.5 rounded-2xl backdrop-blur transition text-sm"
            >
              Create Citizen Account →
            </Link>
          </div>
        </div>
      </section>

      {/* 7. WARM LIGHT SUB-FOOTER */}
      <footer className="bg-white border-t border-amber-200/60 py-8 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900">Fixora</span>
            <span>• Hyperlocal Civic Issue Reporting & Resolution Platform</span>
          </div>
          <div className="flex gap-6 font-bold text-slate-600">
            <Link href="/explore" className="hover:text-emerald-700">Neighborhood Map</Link>
            <Link href="/leaderboard" className="hover:text-emerald-700">Leaderboard</Link>
            <Link href="/track" className="hover:text-emerald-700">Track Defect</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
