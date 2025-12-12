import Image from 'next/image';
import { useMemo } from 'react';

interface MediaArtifactProps {
  src: string;
  alt: string;
  caption?: string;
}

export default function MediaArtifact({ src, alt, caption }: MediaArtifactProps) {
  // Generate a consistent rotation angle based on src to avoid hydration mismatch
  const rotation = useMemo(() => {
    // Use a simple hash of the src to generate consistent rotation
    let hash = 0;
    for (let i = 0; i < src.length; i++) {
      hash = ((hash << 5) - hash) + src.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    // Map hash to rotation between -2.5 and 2.5 degrees
    return ((Math.abs(hash) % 50) / 10) - 2.5;
  }, [src]);

  return (
    <div className="artifact-polaroid" style={{ transform: `rotate(${rotation}deg)` }}>
      <img 
        src={src} 
        alt={alt}
        loading="lazy"
      />
      {caption && (
        <p className="polaroid-caption">{caption}</p>
      )}
    </div>
  );
}
