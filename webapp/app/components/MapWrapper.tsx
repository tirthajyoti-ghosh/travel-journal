"use client";

import dynamic from 'next/dynamic';
import { Story } from '@/lib/api';

// Dynamically import the map component to avoid SSR issues with Leaflet
const InteractiveMap = dynamic(
  () => import('./InteractiveMap'),
  { ssr: false }
);

interface MapWrapperProps {
  stories: Story[];
}

export default function MapWrapper({ stories }: MapWrapperProps) {
  return <InteractiveMap stories={stories} />;
}
