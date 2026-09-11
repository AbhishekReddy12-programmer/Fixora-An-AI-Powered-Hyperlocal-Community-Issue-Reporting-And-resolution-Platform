'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IssueResponse, IssueNearbyResponse } from '@/lib/api-client';
import { ISSUE_CATEGORIES, ISSUE_STATUSES } from '@/lib/constants';
import Link from 'next/link';

interface LeafletCityMapProps {
  issues: (IssueResponse | IssueNearbyResponse)[];
  selectedIssue: IssueResponse | null;
  onSelectIssue?: (issue: IssueResponse) => void;
  center?: [number, number];
  zoom?: number;
}

export default function LeafletCityMap({
  issues,
  selectedIssue,
  onSelectIssue,
  center = [20.5937, 78.9629],
  zoom = 5,
}: LeafletCityMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markerByTrackingCode = useRef<Map<string, L.Marker>>(new Map());
  const [isLocating, setIsLocating] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
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
    if (!mapContainerRef.current) return;

    if ((mapContainerRef.current as any)._leaflet_id) {
      return;
    }

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
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

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    const t3 = setTimeout(() => map.invalidateSize(), 600);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      markerByTrackingCode.current.clear();
    };
  }, []);

  // Update markers and clusters whenever issues change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();
    markerByTrackingCode.current.clear();

    if (issues.length === 0) return;

    // Helper to extract real or fallback coordinates
    const getCoords = (
      issue: IssueResponse | IssueNearbyResponse,
      index: number
    ): [number, number] => {
      if (
        typeof issue.latitude === 'number' &&
        typeof issue.longitude === 'number' &&
        !isNaN(issue.latitude) &&
        !isNaN(issue.longitude)
      ) {
        return [issue.latitude, issue.longitude];
      }
      const INDIAN_METROS: [number, number][] = [
        [28.6139, 77.2090], // New Delhi
        [19.0760, 72.8777], // Mumbai
        [12.9716, 77.5946], // Bengaluru
        [17.3850, 78.4867], // Hyderabad
        [22.5726, 88.3639], // Kolkata
        [13.0827, 80.2707], // Chennai
      ];
      return INDIAN_METROS[index % INDIAN_METROS.length];
    };

    // Group close coordinates into proximity clusters
    interface ClusterItem {
      center: [number, number];
      items: { issue: IssueResponse | IssueNearbyResponse; index: number }[];
    }

    const clusters: ClusterItem[] = [];
    const threshold = 0.0004; // ~40 meters

    issues.forEach((issue, index) => {
      const coords = getCoords(issue, index);
      let matchedCluster = clusters.find(
        (c) =>
          Math.abs(c.center[0] - coords[0]) < threshold &&
          Math.abs(c.center[1] - coords[1]) < threshold
      );

      if (matchedCluster) {
        matchedCluster.items.push({ issue, index });
      } else {
        clusters.push({
          center: coords,
          items: [{ issue, index }],
        });
      }
    });

    clusters.forEach((cluster) => {

      if (cluster.items.length > 1) {
        // Multi-issue cluster marker
        const count = cluster.items.length;
        const highestSeverity = Math.max(
          ...cluster.items.map((i) => i.issue.severity)
        );
        const clusterColor =
          highestSeverity >= 4 ? '#dc2626' : highestSeverity >= 3 ? '#f59e0b' : '#2563eb';

        const clusterIcon = L.divIcon({
          className: 'fixora-map-cluster',
          html: `
            <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: ${clusterColor}33; animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="width: 32px; height: 32px; border-radius: 9999px; background-color: ${clusterColor}; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 13px;">
                ${count}
              </div>
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        const clusterMarker = L.marker(cluster.center, { icon: clusterIcon }).addTo(
          markersGroup
        );

        let popupContent = `
          <div style="font-family: inherit; padding: 4px; max-width: 260px;">
            <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
              📍 ${count} Defects in this Area
            </div>
            <div style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
        `;

        cluster.items.forEach(({ issue }) => {
          const cat = ISSUE_CATEGORIES.find((c) => c.value === issue.category);
          const color = getStatusColor(issue.status);
          popupContent += `
            <div style="background: #f8fafc; padding: 6px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <span style="font-family: monospace; font-size: 10px; font-weight: bold; color: #475569;">${issue.tracking_code}</span>
                <span style="font-size: 9px; font-weight: bold; color: ${color}; background: ${color}18; padding: 2px 6px; border-radius: 9999px;">${issue.status}</span>
              </div>
              <div style="font-size: 11px; font-weight: 700; color: #1e293b;">${issue.title}</div>
              <a href="/track?code=${issue.tracking_code}" style="display: inline-block; margin-top: 4px; font-size: 10px; font-weight: 700; color: #2563eb; text-decoration: none;">View Details →</a>
            </div>
          `;
        });

        popupContent += `
            </div>
          </div>
        `;

        clusterMarker.bindPopup(popupContent, { closeButton: false });

        clusterMarker.on('click', () => {
          map.setView(cluster.center, Math.min(map.getZoom() + 2, 18), { animate: true });
        });
      } else {
        // Single issue pin
        const { issue } = cluster.items[0];
        const color = getStatusColor(issue.status);
        const cat = ISSUE_CATEGORIES.find((c) => c.value === issue.category);

        const customIcon = L.divIcon({
          className: 'fixora-single-pin',
          html: `
            <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: ${color}33; animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="width: 22px; height: 22px; border-radius: 9999px; background-color: ${color}; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; font-size: 10px;">
                ${cat?.icon || '📍'}
              </div>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const marker = L.marker(cluster.center, { icon: customIcon }).addTo(markersGroup);
        markerByTrackingCode.current.set(issue.tracking_code, marker);

        const popupContent = `
          <div style="font-family: inherit; padding: 4px; max-width: 240px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-family: monospace; font-size: 10px; font-weight: bold; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #475569;">
                ${issue.tracking_code}
              </span>
              <span style="font-size: 10px; font-weight: bold; color: ${color}; background: ${color}15; padding: 2px 6px; border-radius: 9999px;">
                ${issue.status}
              </span>
            </div>
            <h4 style="font-weight: 700; font-size: 13px; color: #0f172a; margin: 4px 0 2px 0;">${issue.title}</h4>
            <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0;">${cat?.icon || '📍'} ${cat?.label || issue.category} • P${issue.severity}</p>
            <p style="font-size: 11px; color: #475569; margin: 0 0 8px 0; line-clamp: 2;">${issue.address_text || 'GPS Location'}</p>
            <a href="/track?code=${issue.tracking_code}" style="display: inline-block; width: 100%; text-align: center; background: #059669; color: #ffffff; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; text-decoration: none;">
              Track Defect →
            </a>
          </div>
        `;

        marker.bindPopup(popupContent, { closeButton: false });

        marker.on('click', () => {
          if (onSelectIssue) {
            onSelectIssue(issue);
          }
        });
      }
    });
  }, [issues, onSelectIssue, center]);

  // Focus selected issue when updated externally
  useEffect(() => {
    if (!selectedIssue || !mapInstanceRef.current) return;
    const marker = markerByTrackingCode.current.get(selectedIssue.tracking_code);
    if (marker) {
      mapInstanceRef.current.setView(marker.getLatLng(), 16, { animate: true });
      marker.openPopup();
    }
  }, [selectedIssue]);

  const handleLocateMe = () => {
    if (!('geolocation' in navigator) || !mapInstanceRef.current) return;

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        mapInstanceRef.current?.flyTo([lat, lng], 15, { animate: true });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
      <div
        ref={mapContainerRef}
        className="w-full h-full min-h-[500px] z-10"
        style={{ width: '100%', height: '100%', minHeight: '500px' }}
      />

      {/* Floating Interactive Controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          title="Zoom to my current location"
          className="bg-white/95 hover:bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-md border border-slate-200 flex items-center gap-1.5 backdrop-blur transition active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {isLocating ? (
            <span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>📍</span>
          )}
          <span>{isLocating ? 'Locating...' : 'My Location'}</span>
        </button>
      </div>
    </div>
  );
}
