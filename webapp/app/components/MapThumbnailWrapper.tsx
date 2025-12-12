"use client";

import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import MapThumbnail to avoid SSR issues with Leaflet
const MapThumbnail = dynamic(() => import('./MapThumbnail'), {
  ssr: false,
  loading: () => (
    <Link 
      href="/" 
      className="fixed top-6 left-6 z-50 w-24 h-24 rounded-xl bg-gradient-to-br from-[#F3E8D2] to-[#e4d8c3] shadow-lg flex items-center justify-center border-4 border-white"
    >
      <div className="animate-pulse">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#7A5C3B]">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    </Link>
  ),
});

interface MapThumbnailWrapperProps {
  coordinates?: [number, number];
  zoom?: number;
}

export default function MapThumbnailWrapper({ coordinates, zoom }: MapThumbnailWrapperProps) {
  return <MapThumbnail coordinates={coordinates} zoom={zoom} />;
}
