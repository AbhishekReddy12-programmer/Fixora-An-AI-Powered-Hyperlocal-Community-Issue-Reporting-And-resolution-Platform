'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletLocationPickerProps {
  latitude: number | '';
  longitude: number | '';
  onChangeLocation: (lat: number, lng: number) => void;
  onAddressChange?: (address: string) => void;
}

export default function LeafletLocationPicker({
  latitude,
  longitude,
  onChangeLocation,
  onAddressChange,
}: LeafletLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const isInternalUpdate = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);

  const initialLat = typeof latitude === 'number' && !isNaN(latitude) ? latitude : 28.6139;
  const initialLng = typeof longitude === 'number' && !isNaN(longitude) ? longitude : 77.2090;

  const reverseGeocode = (lat: number, lng: number) => {
    if (!onAddressChange) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsResolvingAddress(true);

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

    fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'en',
      },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (data && data.display_name) {
          const parts = data.display_name.split(', ');
          const formatted = parts.slice(0, 3).join(', ');
          onAddressChange(formatted);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          // Ignore geocoding failure to avoid blocking user flow
        }
      })
      .finally(() => {
        setIsResolvingAddress(false);
      });
  };

  useEffect(() => {
    if (!containerRef.current) return;

    if ((containerRef.current as any)._leaflet_id) {
      return;
    }

    const map = L.map(containerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
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

    const pinIcon = L.divIcon({
      className: 'fixora-location-pin',
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -100%); cursor: grab;">
          <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 0C7.61 0 0 7.61 0 17C0 29.75 17 42 17 42C17 42 34 29.75 34 17C34 7.61 26.39 0 17 0Z" fill="#059669"/>
            <circle cx="17" cy="16" r="7" fill="white"/>
            <circle cx="17" cy="16" r="3.5" fill="#047857"/>
          </svg>
        </div>
      `,
      iconSize: [34, 42],
      iconAnchor: [17, 42],
    });

    const marker = L.marker([initialLat, initialLng], {
      icon: pinIcon,
      draggable: true,
      autoPan: true,
    }).addTo(map);

    marker.on('drag', () => {
      const pos = marker.getLatLng();
      isInternalUpdate.current = true;
      onChangeLocation(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
    });

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      isInternalUpdate.current = true;
      const latFixed = Number(pos.lat.toFixed(6));
      const lngFixed = Number(pos.lng.toFixed(6));
      onChangeLocation(latFixed, lngFixed);
      reverseGeocode(latFixed, lngFixed);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      const latFixed = Number(e.latlng.lat.toFixed(6));
      const lngFixed = Number(e.latlng.lng.toFixed(6));
      marker.setLatLng([latFixed, lngFixed]);
      isInternalUpdate.current = true;
      onChangeLocation(latFixed, lngFixed);
      reverseGeocode(latFixed, lngFixed);
    });

    mapRef.current = map;
    markerRef.current = marker;

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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    if (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      !isNaN(latitude) &&
      !isNaN(longitude) &&
      markerRef.current &&
      mapRef.current
    ) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapRef.current.panTo([latitude, longitude], { animate: true });
    }
  }, [latitude, longitude]);

  const handleLocateMe = () => {
    if (!('geolocation' in navigator)) return;

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        if (markerRef.current && mapRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          mapRef.current.flyTo([lat, lng], 16, { animate: true });
        }
        isInternalUpdate.current = true;
        onChangeLocation(lat, lng);
        reverseGeocode(lat, lng);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  return (
    <div className="relative w-full h-56 min-h-[224px] rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100">
      <div
        ref={containerRef}
        className="w-full h-full min-h-[224px] z-10"
        style={{ width: '100%', height: '100%', minHeight: '224px' }}
      />

      <div className="absolute top-2.5 right-2.5 z-20 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          title="Locate me using GPS"
          className="bg-white/95 hover:bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-md border border-slate-200 flex items-center gap-1.5 backdrop-blur transition active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {isLocating ? (
            <span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>📍</span>
          )}
          <span>{isLocating ? 'Locating...' : 'Locate Me'}</span>
        </button>
      </div>

      <div className="absolute bottom-2.5 left-2.5 z-20 bg-white/95 backdrop-blur px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-700 shadow-xs border border-slate-200 flex items-center gap-1.5 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>
          {isResolvingAddress
            ? 'Resolving address from map...'
            : 'Click map or drag pin to adjust location'}
        </span>
      </div>
    </div>
  );
}
