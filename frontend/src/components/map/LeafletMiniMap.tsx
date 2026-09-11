'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ISSUE_CATEGORIES } from '@/lib/constants';

interface LeafletMiniMapProps {
  latitude: number;
  longitude: number;
  category?: string;
  status?: string;
  addressText?: string | null;
  className?: string;
}

export default function LeafletMiniMap({
  latitude,
  longitude,
  category,
  status = 'REPORTED',
  addressText,
  className = 'h-48',
}: LeafletMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'REPORTED':
      case 'UNDER_VERIFICATION':
        return '#f59e0b';
      case 'VERIFIED':
      case 'UNDER_REVIEW':
      case 'ASSIGNED':
        return '#2563eb';
      case 'IN_PROGRESS':
        return '#7c3aed';
      case 'RESOLVED':
      case 'COMMUNITY_CONFIRMED':
      case 'CLOSED':
        return '#059669';
      case 'REOPENED':
        return '#dc2626';
      default:
        return '#64748b';
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    if ((containerRef.current as any)._leaflet_id) {
      return;
    }

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 16,
      zoomControl: false,
      scrollWheelZoom: false,
    });

    L.control
      .zoom({
        position: 'bottomright',
      })
      .addTo(map);

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const hasMapbox =
      typeof mapboxToken === 'string' &&
      mapboxToken.startsWith('pk.') &&
      !mapboxToken.includes('placeholder');

    if (hasMapbox) {
      L.tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`,
        {
          attribution:
            '© <a href="https://www.mapbox.com/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          tileSize: 512,
          zoomOffset: -1,
          maxZoom: 19,
        }
      ).addTo(map);
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
      }).addTo(map);
    }

    const color = getStatusColor(status);
    const cat = ISSUE_CATEGORIES.find((c) => c.value === category);

    const pinIcon = L.divIcon({
      className: 'fixora-mini-pin',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: ${color}33; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 22px; height: 22px; border-radius: 9999px; background-color: ${color}; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 10px;">
            ${cat?.icon || '📍'}
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    L.marker([latitude, longitude], { icon: pinIcon }).addTo(map);

    mapRef.current = map;

    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    const t3 = setTimeout(() => map.invalidateSize(), 600);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, category, status]);

  return (
    <div className={`relative w-full ${className} rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100`}>
      <div
        ref={containerRef}
        className="w-full h-full min-h-[176px] z-10"
        style={{ width: '100%', height: '100%', minHeight: '176px' }}
      />
      <div className="absolute top-2 left-2 z-20 bg-white/95 backdrop-blur px-2.5 py-1 rounded-md text-[10px] font-semibold text-slate-700 shadow-xs border border-slate-200 pointer-events-none flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>GPS Pin: {latitude.toFixed(4)}, {longitude.toFixed(4)}</span>
      </div>
    </div>
  );
}
