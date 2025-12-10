import Image from 'next/image';
import { useMemo } from 'react';

interface MediaArtifactProps {
  src: string;
  alt: string;
  caption?: string;
}

export default function MediaArtifact({ src, alt, caption }: MediaArtifactProps) {
  // Generate a random rotation angle between -2.5 and 2.5 degrees
  const rotation = useMemo(() => {
    return (Math.random() * 5) - 2.5;
  }, []);

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
