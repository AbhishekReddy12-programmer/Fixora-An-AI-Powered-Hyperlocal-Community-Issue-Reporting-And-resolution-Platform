'use client';

import React, { useState, useEffect } from 'react';
import { api, AdminOverviewResponse, IssueResponse, AdminUser } from '@/lib/api-client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { ISSUE_CATEGORIES, ISSUE_STATUSES } from '@/lib/constants';
import Link from 'next/link';

export default function AdminPage() {
  const [activeAdminTab, setActiveAdminTab] = useState<'issues' | 'users' | 'analytics'>('issues');
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [issues, setIssues] = useState<IssueResponse[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentQueue, setCurrentQueue] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [selectedIssue, setSelectedIssue] = useState<IssueResponse | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Form states
  const [afterImageUrl, setAfterImageUrl] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('a0000000-0000-0000-0000-000000000001');
  const [priorityLevel, setPriorityLevel] = useState(4);
  const [assignNotes, setAssignNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const loadData = async (queue: string = currentQueue) => {
    setIsLoading(true);
    try {
      const [overviewData, issuesData, usersData] = await Promise.all([
        api.get<AdminOverviewResponse>('/admin/overview').catch(() => null),
        api.get<IssueResponse[]>(`/admin/issues?queue=${queue}&limit=50`).catch(() => []),
        api.get<AdminUser[]>('/admin/users?limit=50').catch(() => []),
      ]);
      if (overviewData) setOverview(overviewData);
      setIssues(issuesData);
      setUsers(usersData);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentQueue);
  }, [currentQueue]);

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await api.post(`/admin/issues/${selectedIssue.id}/resolve`, {
        after_image_url: afterImageUrl,
        resolution_notes: resolutionNotes,
      });
      setIsResolveModalOpen(false);
      setAfterImageUrl('');
      setResolutionNotes('');
      setActionSuccess(`Issue ${selectedIssue.tracking_code} marked solved with dual-proof evidence.`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resolve issue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await api.post(`/admin/issues/${selectedIssue.id}/assign`, {
        department_id: selectedDeptId,
        priority_level: priorityLevel,
        internal_notes: assignNotes || null,
      });
      setIsAssignModalOpen(false);
      setAssignNotes('');
      setActionSuccess(`Issue ${selectedIssue.tracking_code} dispatched to department crew.`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to assign crew');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setActionSuccess('User role successfully updated.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    }
  };

  const m = overview?.metrics;

  return (
    <AdminGuard>
      <div className="min-h-screen fixora-bg-action text-slate-800 flex flex-col font-sans">
        {/* Light & Clean Header */}
        <header className="border-b border-amber-200/70 bg-white/95 backdrop-blur sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛️</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900">Fixora Municipal Operations</h1>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
                  ADMIN COMMAND
                </span>
              </div>
              <p className="text-xs text-slate-500">{overview?.ward_name || 'Municipal Division'} • Metro Central Ward</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveAdminTab('issues')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeAdminTab === 'issues' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Queue Triage
              </button>
              <button
                onClick={() => setActiveAdminTab('users')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeAdminTab === 'users' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Citizens & Workers ({users.length})
              </button>
              <button
                onClick={() => setActiveAdminTab('analytics')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeAdminTab === 'analytics' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Ward Analytics
              </button>
            </div>

            <Link
              href="/"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
            >
              Citizen View →
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
          {/* Notification Banner */}
          {actionSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between">
              <span>✓ {actionSuccess}</span>
              <button onClick={() => setActionSuccess('')} className="text-emerald-500 hover:text-emerald-800">✕</button>
            </div>
          )}

          {/* Metrics Ribbon in Warm White Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-amber-200/70 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-400">Total Reported</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{m?.total_issues ?? issues.length}</p>
            </div>
            <div className="bg-white border border-amber-300/80 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-amber-700">Needs Verification</span>
              <p className="text-2xl font-black text-amber-600 mt-1">{m?.awaiting_verification ?? 0}</p>
            </div>
            <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-blue-700">Ready for Crew</span>
              <p className="text-2xl font-black text-blue-600 mt-1">{m?.verified_pending_action ?? 0}</p>
            </div>
            <div className="bg-white border border-purple-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-purple-700">Dispatched Crews</span>
              <p className="text-2xl font-black text-purple-600 mt-1">{m?.in_progress ?? 0}</p>
            </div>
            <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-emerald-700">Solved (Pending)</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{m?.solved_pending_confirmation ?? 0}</p>
            </div>
            <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-rose-700">Reopened / Disputed</span>
              <p className="text-2xl font-black text-rose-600 mt-1">{m?.reopened_disputed ?? 0}</p>
            </div>
          </div>

          {/* TAB 1: ISSUES QUEUE TRIAGE */}
          {activeAdminTab === 'issues' && (
            <div className="space-y-4">
              {/* Queue Filter Tabs */}
              <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                {[
                  { id: 'all', label: 'All Complaints' },
                  { id: 'verification', label: 'Verification Queue' },
                  { id: 'pending_dispatch', label: 'Pending Crew' },
                  { id: 'in_progress', label: 'In Progress' },
                  { id: 'solved', label: 'Solved (Dual-Proof)' },
                  { id: 'reopened', label: 'Disputed / Reopened' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentQueue(tab.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                      currentQueue === tab.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Issue Cards Feed */}
              {isLoading ? (
                <div className="p-12 text-center text-slate-400 text-xs">Loading queue items...</div>
              ) : issues.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-amber-200/70">
                  No issues currently in this queue.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {issues.map(issue => (
                    <div
                      key={issue.id}
                      className={`bg-white border rounded-3xl p-5 flex flex-col justify-between transition hover:shadow-md ${
                        issue.status === 'REOPENED'
                          ? 'border-rose-300 bg-rose-50/20'
                          : 'border-amber-200/70'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-bold">
                              {issue.tracking_code}
                            </span>
                            {issue.status === 'REOPENED' && (
                              <span className="bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md animate-pulse">
                                REOPENED BY COMMUNITY
                              </span>
                            )}
                          </div>
                          <span
                            className="text-xs px-2.5 py-0.5 rounded-full font-bold"
                            style={{
                              backgroundColor: `${
                                ISSUE_STATUSES.find(s => s.value === issue.status)?.color
                              }20`,
                              color: ISSUE_STATUSES.find(s => s.value === issue.status)?.color,
                            }}
                          >
                            {issue.status}
                          </span>
                        </div>

                        <h3 className="font-black text-slate-900 text-base mb-1">{issue.title}</h3>
                        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{issue.description || 'No description provided.'}</p>

                        <div className="flex flex-wrap gap-2 text-xs text-slate-400 mb-4">
                          <span>{ISSUE_CATEGORIES.find(c => c.value === issue.category)?.icon} {issue.category}</span>
                          <span>•</span>
                          <span>Priority: P{issue.severity}</span>
                          <span>•</span>
                          <span>{issue.address_text || 'GPS Pinned'}</span>
                        </div>

                        {/* Verification & Proof info */}
                        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-3 mb-4 text-xs space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Neighbor Votes:</span>
                            <strong className="text-slate-800">{issue.verification_count} community votes</strong>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">AI Confidence:</span>
                            <strong className="text-blue-700">{issue.confidence_score.toFixed(0)}%</strong>
                          </div>
                          {issue.after_image_url && (
                            <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
                              <span>✓</span>
                              <span>After photo submitted (Dual-Proof active)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions Bar */}
                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setSelectedIssue(issue);
                            setIsAssignModalOpen(true);
                          }}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-xl transition"
                        >
                          Assign Crew
                        </button>

                        <button
                          onClick={() => {
                            setSelectedIssue(issue);
                            setIsResolveModalOpen(true);
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl transition"
                        >
                          Mark Solved (Proof)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CITIZENS & WORKERS DIRECTORY */}
          {activeAdminTab === 'users' && (
            <div className="space-y-4">
              <div className="bg-white border border-amber-200/70 rounded-3xl p-6 shadow-xs">
                <h3 className="text-base font-black text-slate-900 mb-1">Ward Citizen & Worker Directory</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Manage roles, view community Karma XP standings, and monitor active civic contributors.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-3">Member</th>
                        <th className="p-3">Contact</th>
                        <th className="p-3">Current Role</th>
                        <th className="p-3 text-center">Karma XP</th>
                        <th className="p-3 text-center">Credibility</th>
                        <th className="p-3 text-right">Role Assignment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">
                            No users registered yet.
                          </td>
                        </tr>
                      ) : (
                        users.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50 transition">
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{u.full_name}</div>
                              <span className="text-[10px] text-slate-400 font-mono">{u.id.substring(0, 8)}...</span>
                            </td>
                            <td className="p-3 text-slate-500">
                              {u.email || u.phone || 'No direct contact'}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                                  u.role === 'MUNICIPAL_ADMIN'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : u.role === 'FIELD_WORKER'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td className="p-3 text-center font-black text-amber-600">
                              {u.karma_points} XP
                            </td>
                            <td className="p-3 text-center text-emerald-700 font-black">
                              {u.credibility_score.toFixed(0)}%
                            </td>
                            <td className="p-3 text-right">
                              <select
                                value={u.role}
                                onChange={e => handleRoleChange(u.id, e.target.value)}
                                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-bold outline-none"
                              >
                                <option value="CITIZEN">CITIZEN</option>
                                <option value="FIELD_WORKER">FIELD_WORKER</option>
                                <option value="MUNICIPAL_ADMIN">MUNICIPAL_ADMIN</option>
                              </select>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WARD ANALYTICS */}
          {activeAdminTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-amber-200/70 rounded-3xl p-6 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Average Response Time
                  </h4>
                  <div className="text-3xl font-black text-slate-900">36.4 hrs</div>
                  <p className="text-xs text-slate-500 mt-1">From REPORTED to CREW_ASSIGNED</p>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 mt-4">
                    <div className="bg-emerald-500 h-2.5 rounded-full w-[72%]"></div>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold mt-1.5 block">Within municipal SLA target (48 hrs)</span>
                </div>

                <div className="bg-white border border-amber-200/70 rounded-3xl p-6 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Community Verification Rate
                  </h4>
                  <div className="text-3xl font-black text-blue-600">91.8%</div>
                  <p className="text-xs text-slate-500 mt-1">Issues confirmed by 3+ neighbors</p>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 mt-4">
                    <div className="bg-blue-500 h-2.5 rounded-full w-[91%]"></div>
                  </div>
                  <span className="text-[10px] text-blue-700 font-bold mt-1.5 block">High ward neighbor participation</span>
                </div>

                <div className="bg-white border border-amber-200/70 rounded-3xl p-6 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Dual-Proof Acceptance
                  </h4>
                  <div className="text-3xl font-black text-teal-600">94.2%</div>
                  <p className="text-xs text-slate-500 mt-1">Resolutions signed off without dispute</p>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 mt-4">
                    <div className="bg-teal-500 h-2.5 rounded-full w-[94%]"></div>
                  </div>
                  <span className="text-[10px] text-teal-700 font-bold mt-1.5 block">Only 5.8% disputed / reopened</span>
                </div>
              </div>

              {/* Department breakdown */}
              <div className="bg-white border border-amber-200/70 rounded-3xl p-6 shadow-xs">
                <h4 className="text-base font-black text-slate-900 mb-4">Department Workload Distribution</h4>
                <div className="space-y-3">
                  {[
                    { name: 'Public Works & Roads', count: 18, color: 'bg-amber-500' },
                    { name: 'Sanitation & Solid Waste', count: 12, color: 'bg-blue-500' },
                    { name: 'Water Supply & Sewerage', count: 9, color: 'bg-teal-500' },
                    { name: 'Electricity & Streetlighting', count: 6, color: 'bg-purple-500' },
                  ].map(dept => (
                    <div key={dept.name}>
                      <div className="flex justify-between text-xs mb-1 font-bold">
                        <span className="text-slate-700">{dept.name}</span>
                        <span className="text-slate-500">{dept.count} active tickets</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div
                          className={`${dept.color} h-2.5 rounded-full`}
                          style={{ width: `${(dept.count / 45) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Modal: Assign Crew */}
        {isAssignModalOpen && selectedIssue && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-amber-200/80 rounded-3xl max-w-md w-full p-6 text-slate-800 shadow-2xl">
              <h2 className="text-lg font-black text-slate-900 mb-1">Dispatch Municipal Crew</h2>
              <p className="text-xs text-slate-500 mb-4">Assigning issue: {selectedIssue.tracking_code}</p>

              {errorMsg && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl mb-3">{errorMsg}</div>}

              <form onSubmit={handleAssignSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Department</label>
                  <select
                    value={selectedDeptId}
                    onChange={e => setSelectedDeptId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-bold"
                  >
                    <option value="a0000000-0000-0000-0000-000000000001">Public Works & Roads (ROADS)</option>
                    <option value="a0000000-0000-0000-0000-000000000002">Sanitation & Solid Waste (SANITATION)</option>
                    <option value="a0000000-0000-0000-0000-000000000003">Water Supply & Sewerage (WATER)</option>
                    <option value="a0000000-0000-0000-0000-000000000004">Electricity & Lighting (POWER)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority (1 = Low, 5 = Urgent)</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={priorityLevel}
                    onChange={e => setPriorityLevel(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs text-slate-500 block text-center font-bold">Priority: P{priorityLevel}</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Internal Instructions</label>
                  <textarea
                    value={assignNotes}
                    onChange={e => setAssignNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g., Heavy equipment needed for clearing..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs"
                  >
                    {isSubmitting ? 'Dispatching...' : 'Dispatch Crew'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Mark Solved (Dual-Proof Upload) */}
        {isResolveModalOpen && selectedIssue && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-amber-200/80 rounded-3xl max-w-md w-full p-6 text-slate-800 shadow-2xl">
              <h2 className="text-lg font-black text-slate-900 mb-1">Upload Dual-Proof Resolution</h2>
              <p className="text-xs text-slate-500 mb-4">
                Mandatory resolution evidence for {selectedIssue.tracking_code}.
              </p>

              {errorMsg && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl mb-3">{errorMsg}</div>}

              <form onSubmit={handleResolveSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    After Photo URL (Mandatory Evidence)
                  </label>
                  <input
                    type="url"
                    required
                    value={afterImageUrl}
                    onChange={e => setAfterImageUrl(e.target.value)}
                    placeholder="https://media.fixora.org/proof/fixed.jpg"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Resolution Summary (Min 10 chars)</label>
                  <textarea
                    required
                    minLength={10}
                    value={resolutionNotes}
                    onChange={e => setResolutionNotes(e.target.value)}
                    rows={3}
                    placeholder="Describe how the defect was resolved..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResolveModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs"
                  >
                    {isSubmitting ? 'Uploading...' : 'Submit Resolution'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
