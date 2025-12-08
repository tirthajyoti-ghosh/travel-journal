"use client";

import React from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
} from "react-simple-maps";
import { Story } from "@/lib/api";
import Link from "next/link";

const geoUrl = "/maps/world-110m.json";

interface MapProps {
  stories: Story[];
}

export default function InteractiveMap({ stories }: MapProps) {
  return (
    <div className="w-full h-screen bg-[#a8d5e5] overflow-hidden">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 120,
        }}
        className="w-full h-full"
      >
        <ZoomableGroup center={[115, 10]} zoom={3} minZoom={1} maxZoom={8}>
          {/* Base Map Layer */}
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                // Filter out Antarctica (ISO code 010 or name)
                if (geo.properties.name === "Antarctica" || geo.id === "010") return null;

                // Check if country is in Southeast Asia (Approximate list of ISO numeric codes)
                // 704(VN), 764(TH), 116(KH), 418(LA), 104(MM), 458(MY), 702(SG), 360(ID), 608(PH), 096(BN), 626(TL)
                const seaIds = ["704", "764", "116", "418", "104", "458", "702", "360", "608", "096", "626"];
                const isSEA = seaIds.includes(geo.id);

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isSEA ? "#f4f1ea" : "#d1d5db"} // Parchment for SEA, Gray for others
                    stroke={isSEA ? "#d4c5b0" : "#9ca3af"} // Darker stroke for disabled
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { fill: isSEA ? "#e9e3d3" : "#d1d5db", outline: "none" },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {/* Story Pins */}
          {stories.map((story) => {
            if (!story.coordinates) return null;
            const thumbUrl = story.media_item_ids?.[0];

            return (
              <Marker key={story.slug} coordinates={story.coordinates}>
                <Link href={`/stories/${story.slug}`}>
                  <g
                    className="cursor-pointer hover:scale-110 transition-transform duration-200"
                    style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}
                  >
                    {/* Pin Stem */}
                    <line x1="0" y1="0" x2="0" y2="-5" stroke="#666" strokeWidth="0.5" />
                    
                    {/* Polaroid Frame */}
                    <rect
                      x="-6"
                      y="-18"
                      width="12"
                      height="14"
                      fill="white"
                      stroke="#999"
                      strokeWidth="0.5"
                      rx="0.5"
                      filter="drop-shadow(0.5px 1px 1px rgba(0,0,0,0.2))"
                    />
                    
                    {/* Photo Area */}
                    {thumbUrl ? (
                      <image
                        href={thumbUrl}
                        x="-5"
                        y="-17"
                        width="10"
                        height="10"
                        preserveAspectRatio="xMidYMid slice"
                      />
                    ) : (
                      <rect
                        x="-5"
                        y="-17"
                        width="10"
                        height="10"
                        fill="#333"
                      />
                    )}
                  </g>
                </Link>
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}
