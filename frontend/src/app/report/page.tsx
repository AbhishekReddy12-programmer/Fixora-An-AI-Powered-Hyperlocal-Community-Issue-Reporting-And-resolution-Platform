'use client'

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { ISSUE_CATEGORIES, SEVERITY_LABELS } from '@/lib/constants';
import Link from 'next/link';

const LeafletLocationPicker = dynamic(
  () => import('@/components/map/LeafletLocationPicker'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-48 rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
        Loading interactive map picker...
      </div>
    ),
  }
);

export default function Report() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [lat, setLat] = useState<number | ''>('');
  const [lng, setLng] = useState<number | ''>('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState(3);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [error, setError] = useState('');
  const [trackingCode, setTrackingCode] = useState('');

  const handleGenerateDescription = async () => {
    const activeCategory = category || 'POTHOLE';
    setIsGeneratingDesc(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
      const locText = address || (lat !== '' && lng !== '' ? `${lat}, ${lng}` : 'Local neighborhood');
      const res = await fetch(`${API_BASE}/issues/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: activeCategory,
          title: title || `${activeCategory.replace('_', ' ')} issue`,
          address: locText,
          severity: severity || 3,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.description) {
          setDescription(data.description);
          return;
        }
      }
      const catClean = activeCategory.replace('_', ' ').toLowerCase();
      setDescription(`A noticeable ${catClean} has been identified at this location (${locText}). The defect creates a visible disruption and safety hazard for commuters and pedestrians. Prompt municipal inspection and repair are requested to restore safe transit.`);
    } catch (err) {
      console.warn('AI description generation fallback:', err);
      const catClean = (category || 'defect').replace('_', ' ').toLowerCase();
      const locText = address || (lat !== '' && lng !== '' ? `${lat}, ${lng}` : 'this area');
      setDescription(`A persistent ${catClean} has been observed at ${locText}, posing safety hazards and transit delays for neighborhood residents. Immediate municipal intervention is recommended.`);
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (step === 2 && 'geolocation' in navigator && lat === '' && lng === '') {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
        },
        () => console.warn("Geolocation denied or failed")
      );
    }
  }, [step, lat, lng]);

  if (authLoading || !isAuthenticated) return null;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));

      setIsUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
        const res = await fetch(`${API_BASE}/issues/upload`, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.public_url) {
            setUploadedImageUrl(data.public_url);
          }
          if (data.ai_triage) {
            if (data.ai_triage.category && !category) {
              setCategory(data.ai_triage.category);
            }
            if (data.ai_triage.severity) {
              setSeverity(data.ai_triage.severity);
            }
            if (data.ai_triage.suggested_title && !title) {
              setTitle(data.ai_triage.suggested_title);
            }
            if (data.ai_triage.suggested_description && !description) {
              setDescription(data.ai_triage.suggested_description);
            }
          }
        }
      } catch (err) {
        console.warn('Direct upload deferred:', err);
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!title || !category || lat === '' || lng === '') {
      setError('Please fill in all required fields');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      let finalImageUrl = uploadedImageUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7';

      if (!uploadedImageUrl && imageFile) {
        try {
          const formData = new FormData();
          formData.append('file', imageFile);
          const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
          const upRes = await fetch(`${API_BASE}/issues/upload`, {
            method: 'POST',
            body: formData,
          });
          if (upRes.ok) {
            const upData = await upRes.json();
            if (upData.public_url) finalImageUrl = upData.public_url;
          }
        } catch {
          // fallback to standard image
        }
      }
      
      const payload = {
        title,
        description,
        category,
        severity,
        latitude: Number(lat),
        longitude: Number(lng),
        address_text: address,
        before_image_url: finalImageUrl
      };

      const res = await api.post<{tracking_code: string}>('/issues/', payload);
      setTrackingCode(res.tracking_code);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (trackingCode) {
    return (
      <div className="min-h-screen fixora-bg-action flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Issue Reported!</h2>
          <p className="text-gray-600 mb-6">Thank you for reporting. Your tracking code is:</p>
          <div className="bg-gray-100 p-4 rounded-lg text-xl font-mono font-bold text-gray-800 mb-6">
            {trackingCode}
          </div>
          <Link href={`/track?code=${trackingCode}`} className="block w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 mb-3">
            Track Issue
          </Link>
          <Link href="/" className="block w-full text-gray-600 py-2 hover:bg-gray-50 rounded-lg">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen fixora-bg-action p-6 flex flex-col items-center">
      <div className="w-full max-w-xl">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-gray-500 hover:text-gray-900">Cancel</Link>
          <div className="text-sm font-medium text-gray-500">Step {step} of 3</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Upload Photo</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition cursor-pointer relative">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                ) : (
                  <div className="text-gray-500">
                    <span className="text-4xl block mb-2">📸</span>
                    Tap to select or capture a photo
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <button disabled={!imageFile} onClick={() => setStep(2)} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Location & Category</h2>

              {/* Interactive Leaflet Map Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pin Defect Location on Map
                </label>
                <LeafletLocationPicker
                  latitude={lat}
                  longitude={lng}
                  onChangeLocation={(newLat, newLng) => {
                    setLat(newLat);
                    setLng(newLng);
                  }}
                  onAddressChange={(resolved) => {
                    if (!address.trim()) {
                      setAddress(resolved);
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={e => {
                      const val = e.target.value;
                      setLat(val === '' ? '' : parseFloat(val));
                    }}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={e => {
                      const val = e.target.value;
                      setLng(val === '' ? '' : parseFloat(val));
                    }}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address / Landmark (Optional)</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="">Select a category</option>
                  {ISSUE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity (1-5)</label>
                <input type="range" min="1" max="5" value={severity} onChange={e => setSeverity(parseInt(e.target.value))} className="w-full" />
                <div className="text-center text-sm font-medium text-gray-600">{severity} - {SEVERITY_LABELS.find(s => s.level === severity)?.label}</div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200">Back</button>
                <button 
                  disabled={lat === '' || lng === '' || !category} 
                  onClick={() => {
                    setStep(3);
                    if (!description) {
                      handleGenerateDescription();
                    }
                  }} 
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Review & Submit</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Brief title..." className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-800">
                    Description <span className="text-gray-400 font-normal text-xs">(AI Assisted)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={isGeneratingDesc}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full transition-all disabled:opacity-50 shadow-xs cursor-pointer active:scale-95"
                    title="Generate or refine a professional description using Groq AI"
                  >
                    <span>{isGeneratingDesc ? '⏳ Generating...' : '✨ Auto-Write with AI'}</span>
                  </button>
                </div>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  rows={3} 
                  placeholder={isGeneratingDesc ? "AI is generating a detailed description..." : "Detailed defect description..."} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm text-gray-800 leading-relaxed"
                />
                {description && (
                  <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-medium">
                    <span>✨</span> AI generated description based on defect data. You can freely edit or expand it above.
                  </p>
                )}
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2 mt-4 border border-gray-100">
                <p><strong>Category:</strong> {ISSUE_CATEGORIES.find(c => c.value === category)?.icon} {ISSUE_CATEGORIES.find(c => c.value === category)?.label}</p>
                <p><strong>Location:</strong> {lat}, {lng}</p>
                <p><strong>Severity:</strong> {severity} - {SEVERITY_LABELS.find(s => s.level === severity)?.label}</p>
              </div>

              <div className="flex gap-4 mt-6">
                <button onClick={() => setStep(2)} disabled={isSubmitting} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50">Back</button>
                <button onClick={handleSubmit} disabled={!title || isSubmitting} className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50">
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
