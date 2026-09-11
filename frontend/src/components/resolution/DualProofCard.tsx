'use client';

import React, { useState } from 'react';
import { api, IssueResponse } from '@/lib/api-client';

interface DualProofCardProps {
  issue: IssueResponse;
  onConfirmed: (updated: IssueResponse) => void;
}

export function DualProofCard({ issue, onConfirmed }: DualProofCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDisputeInput, setShowDisputeInput] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (issue.status !== 'RESOLVED') return null;

  const handleVote = async (isSatisfactory: boolean) => {
    setIsSubmitting(true);
    setError('');
    try {
      const updated = await api.post<IssueResponse>(`/issues/${issue.id}/confirm-resolution`, {
        is_satisfactory: isSatisfactory,
        dispute_reason: isSatisfactory ? null : disputeReason || 'Defect still present.',
        dispute_image_url: null,
      });

      if (isSatisfactory) {
        setSuccessMsg('Thank you! Repair confirmed and marked as closed.');
      } else {
        setSuccessMsg('Issue reopened. The Community Admin has been notified for re-inspection.');
      }
      onConfirmed(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to submit confirmation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm my-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">🔍</span>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Dual-Proof Resolution Review</h3>
          <p className="text-xs text-gray-600">
            The Community Admin uploaded repair evidence. Does this defect still exist?
          </p>
        </div>
      </div>

      {/* Before / After Photo Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
        <div className="bg-white rounded-xl p-3 border border-gray-200">
          <span className="text-xs font-semibold text-gray-500 block mb-2">BEFORE (Reported Photo)</span>
          <img
            src={issue.before_image_url || 'https://via.placeholder.com/400x250?text=Before+Photo'}
            alt="Before repair"
            className="w-full h-44 object-cover rounded-lg"
          />
        </div>

        <div className="bg-white rounded-xl p-3 border border-green-200">
          <span className="text-xs font-semibold text-green-600 block mb-2">AFTER (Repair Evidence)</span>
          <img
            src={issue.after_image_url || 'https://via.placeholder.com/400x250?text=After+Proof'}
            alt="After repair proof"
            className="w-full h-44 object-cover rounded-lg"
          />
        </div>
      </div>

      {error && <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg mb-3">{error}</div>}
      {successMsg && (
        <div className="text-xs text-green-700 bg-green-50 p-2.5 rounded-lg mb-3 font-medium">
          {successMsg}
        </div>
      )}

      {showDisputeInput && (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Why is this repair unsatisfactory? (Optional)
          </label>
          <input
            type="text"
            value={disputeReason}
            onChange={e => setDisputeReason(e.target.value)}
            placeholder="e.g., Pothole was only partially patched, rubble left behind..."
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => handleVote(true)}
          disabled={isSubmitting}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span>✓</span> Confirm Fixed (+20 XP)
        </button>

        {!showDisputeInput ? (
          <button
            onClick={() => setShowDisputeInput(true)}
            className="flex-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 font-semibold py-2.5 px-4 rounded-xl text-sm transition"
          >
            ✕ Defect Still Exists
          </button>
        ) : (
          <button
            onClick={() => handleVote(false)}
            disabled={isSubmitting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition shadow-sm disabled:opacity-50"
          >
            Submit Dispute & Reopen
          </button>
        )}
      </div>
    </div>
  );
}
