"use client";

import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, GeoJSON } from "react-leaflet";
import L from "leaflet";
import { Story } from "@/lib/api";
import Link from "next/link";

interface MapProps {
  stories: Story[];
}

// Function to create custom marker with photo frame and pin
const createCustomMarker = (story: Story) => {
  const thumbUrl = story.media_item_ids?.[0];
  const rotation = (story.slug.length % 7) - 3;
  
  return L.divIcon({
    html: `
      <a href="/stories/${story.slug}" class="block">
        <div style="position: relative; width: 60px; height: 90px;">
          <!-- Polaroid Photo Frame (behind the pin) -->
          <div style="
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) rotate(${rotation}deg);
            background: white;
            padding: 7px;
            border-radius: 4px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            width: 56px;
            height: 66px;
            z-index: 1;
          ">
            <div style="
              width: 42px;
              height: 42px;
              background-image: url('${thumbUrl || ''}');
              background-size: cover;
              background-position: center;
              border-radius: 2px;
              ${!thumbUrl ? 'background-color: #d1d5db;' : ''}
            "></div>
          </div>
          
          <!-- Hand-drawn Map Pin (on top) -->
          <img 
            src="/textures/map-pin.png"
            style="
              position: absolute;
              top: 0;
              left: 50%;
              transform: translateX(-50%);
              width: 32px;
              height: 32px;
              filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.4));
              z-index: 2;
            "
          />
        </div>
      </a>
    `,
    className: 'custom-marker',
    iconSize: [60, 90],
    iconAnchor: [30, 90],
  });
};

export default function InteractiveMap({ stories }: MapProps) {
  const [worldBorders, setWorldBorders] = useState<any>(null);

  useEffect(() => {
    // Load world borders GeoJSON (50m resolution for smoother curves)
    fetch('/maps/world-50m.geojson')
      .then(res => res.json())
      .then(data => setWorldBorders(data));
  }, []);

  return (
    <div className="relative w-full h-screen">
      {/* TEXTURED BACKGROUND - Watercolor Ocean */}
      <div 
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: 'url(/textures/sea-watercolor.png)' }}
      />

      {/* PAPER GRAIN OVERLAY */}
      <div 
        className="absolute inset-0 -z-10 mix-blend-multiply opacity-40 bg-repeat"
        style={{ backgroundImage: 'url(/textures/paper-texture.png)' }}
      />

      {/* PAPER CRACKS OVERLAY */}
      <div 
        className="absolute inset-0 -z-10 mix-blend-multiply opacity-25 bg-repeat"
        style={{ backgroundImage: 'url(/textures/paper-hatch.png)' }}
      />

      {/* VIGNETTE */}
      <div 
        className="absolute inset-0 -z-10 pointer-events-none mix-blend-multiply"
        style={{
          background: 'radial-gradient(circle at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.25) 100%)'
        }}
      />

      {/* GRADIENT OVERLAY */}
      <div 
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom right, rgba(255,255,255,0.1), rgba(255,255,255,0.2))'
        }}
      />

      {/* INNER SHADOW */}
      <div 
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.12)'
        }}
      />

      <MapContainer
        center={[10, 115]}
        zoom={4}
        minZoom={2}
        maxZoom={10}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
        worldCopyJump={false}
        style={{ width: "100%", height: "100%" }}
        zoomControl={true}
      >
        {/* Watercolor-style Map Tiles */}
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg"
          attribution="&copy; Stadia Maps & Stamen Design"
        />

        {/* Border Layer - Watercolor-compatible visible borders */}
        {worldBorders && (
          <>
            {/* Inner white highlight (subtle paper lift effect) */}
            <GeoJSON
              data={worldBorders}
              style={() => ({
                color: "rgba(255, 255, 255, 0.7)",
                weight: 0.8,
                fill: false,
                opacity: 0.6,
              })}
            />
            {/* Outer warm sepia stroke (visible hand-drawn border) */}
            <GeoJSON
              data={worldBorders}
              style={() => ({
                color: "rgba(80, 60, 50, 0.55)",
                weight: 1.3,
                fill: false,
                opacity: 0.9,
                lineJoin: "round",
                lineCap: "round",
              })}
            />
          </>
        )}

        {/* Story Pins with Photo Frames */}
        {stories.map((story) => {
          if (!story.coordinates) return null;

          return (
            <Marker
              key={story.slug}
              position={[story.coordinates[1], story.coordinates[0]]}
              icon={createCustomMarker(story)}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
