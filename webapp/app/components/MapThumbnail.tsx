"use client";

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface MapThumbnailProps {
  coordinates?: [number, number]; // [longitude, latitude]
  zoom?: number;
}

export default function MapThumbnail({ coordinates, zoom = 8 }: MapThumbnailProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Prevent double initialization in development
    if (mapRef.current) return;

    let mounted = true;
    let captureTimeout: NodeJS.Timeout;

    // Dynamically import Leaflet and leaflet-image
    Promise.all([
      import('leaflet'),
      import('leaflet-image'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([L, leafletImageModule]) => {
      if (!mounted) return;

      const leafletImage = leafletImageModule.default;
      
      // If no coordinates provided, use a default world view
      const center: [number, number] = coordinates 
        ? [coordinates[1], coordinates[0]] // Leaflet uses [lat, lng]
        : [20, 0]; // Default center
      
      // Use zoom level 2 to show wider continental/multi-continental view
      const zoomLevel = coordinates ? 2 : 2;

      // Create off-screen container if not exists
      if (!containerRef.current) return;

      // Check if container is already initialized
      if (containerRef.current.innerHTML !== '') {
        containerRef.current.innerHTML = '';
      }

      // Initialize mini map
      const miniMap = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
        touchZoom: false,
      }).setView(center, zoomLevel);

      mapRef.current = miniMap;

      // Add watercolor tile layer (same as main map)
      const tileLayer = L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg', {
        maxZoom: 16,
        attribution: '',
      });
      
      tileLayer.addTo(miniMap);

      // Wait for tiles to load, then capture (without marker to avoid leaflet-image issues)
      let tilesLoaded = 0;
      const totalTiles = 4; // Approximate number of tiles

      tileLayer.on('tileload', () => {
        tilesLoaded++;
        if (tilesLoaded >= totalTiles) {
          // Give a moment for final rendering
          captureTimeout = setTimeout(() => {
            if (!mounted || !mapRef.current) return;
            
            leafletImage(miniMap, (err: Error | null, canvas: HTMLCanvasElement) => {
              if (!mounted) return;
              
              if (err) {
                console.error('Error generating thumbnail:', err);
                setIsLoading(false);
                return;
              }
              
              const dataUrl = canvas.toDataURL('image/png');
              setThumbnail(dataUrl);
              setIsLoading(false);
              
              // Cleanup
              if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
              }
            });
          }, 500);
        }
      });

      // Fallback timeout in case tiles don't load
      const fallbackTimeout = setTimeout(() => {
        if (!mounted || !mapRef.current) return;
        
        leafletImage(miniMap, (err: Error | null, canvas: HTMLCanvasElement) => {
          if (!mounted) return;
          
          if (err) {
            console.error('Error generating thumbnail:', err);
            setIsLoading(false);
            return;
          }
          
          const dataUrl = canvas.toDataURL('image/png');
          setThumbnail(dataUrl);
          setIsLoading(false);
          
          // Cleanup
          if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
          }
        });
      }, 2500);

      // Cleanup function
      return () => {
        clearTimeout(captureTimeout);
        clearTimeout(fallbackTimeout);
      };
    }).catch((error) => {
      if (mounted) {
        console.error('Error loading map libraries:', error);
        setIsLoading(false);
      }
    });

    // Cleanup function
    return () => {
      mounted = false;
      clearTimeout(captureTimeout);
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          // Ignore errors during cleanup
        }
        mapRef.current = null;
      }
    };
  }, [coordinates, zoom]);

  // Bounce on upward scroll effect
  useEffect(() => {
    let lastY = window.scrollY;
    const thumbElement = document.getElementById('floating-map-thumb');

    const handleScroll = () => {
      const currentY = window.scrollY;

      if (currentY < lastY - 5 && thumbElement) {
        thumbElement.style.transform = 'translateY(-3px) rotate(-3deg)';
        setTimeout(() => {
          if (thumbElement) thumbElement.style.transform = 'translateY(0) rotate(-3deg)';
        }, 150);
      }

      lastY = currentY;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <Link 
        href="/" 
        id="floating-map-thumb"
        className="
          fixed z-50 left-4 top-4
          w-20 h-20 sm:w-24 sm:h-24
          rounded-xl overflow-hidden
          shadow-[4px_4px_12px_rgba(0,0,0,0.25)]
          rotate-[-3deg]
          border-[3px] border-[#f2e7c9]
          backdrop-blur-[2px]
          active:scale-[0.97]
          cursor-pointer
          transition-all duration-300 ease-out
          hover:shadow-[6px_6px_16px_rgba(0,0,0,0.3)]
          hover:rotate-[-1deg]
        "
        style={{
          backgroundImage: "url('/textures/paper-texture.png')",
          backgroundSize: 'cover',
          animation: 'floatIn 0.45s ease-out forwards',
        }}
      >
        {/* Tape corners - scrapbook aesthetic */}
        <div className="absolute -top-2 left-3 rotate-[-2deg] w-8 h-4 bg-neutral-200/70 rounded-sm shadow-sm" />
        <div className="absolute -bottom-2 right-2 rotate-[1deg] w-8 h-4 bg-neutral-200/70 rounded-sm shadow-sm" />

        {/* Map preview content */}
        {isLoading ? (
          // Loading placeholder
          <div className="w-full h-full bg-gradient-to-br from-[#F3E8D2] to-[#e4d8c3] flex items-center justify-center">
            <div className="animate-pulse">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#7A5C3B]">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
          </div>
        ) : thumbnail ? (
          // Rendered thumbnail with vintage effect
          <img 
            src={thumbnail} 
            alt="Map preview" 
            className="w-full h-full object-cover mix-blend-multiply opacity-95"
          />
        ) : (
          // Fallback icon
          <div className="w-full h-full bg-gradient-to-br from-[#F3E8D2] to-[#e4d8c3] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#7A5C3B]">
              <path d="M3 8L15 8"/>
              <path d="M3 12L21 12"/>
              <path d="M3 16L15 16"/>
            </svg>
          </div>
        )}
      </Link>

      {/* Hidden off-screen container for map rendering */}
      <div
        ref={containerRef}
        style={{
          width: '200px',
          height: '200px',
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          visibility: 'hidden',
        }}
      />

      {/* Float-in animation */}
      <style jsx>{`
        @keyframes floatIn {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(-10px) rotate(-3deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0) rotate(-3deg);
          }
        }
      `}</style>
    </>
  );
}
