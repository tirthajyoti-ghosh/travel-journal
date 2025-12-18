import { useMemo } from 'react';

interface VideoArtifactProps {
  src?: string;
  controls?: boolean;
  playsInline?: boolean;
  className?: string;
}

export default function VideoArtifact({ src, controls, playsInline, className }: VideoArtifactProps) {
  // Generate a consistent rotation angle based on src to avoid hydration mismatch
  const rotation = useMemo(() => {
    if (!src) return 0;
    // Use a simple hash of the src to generate consistent rotation
    let hash = 0;
    for (let i = 0; i < src.length; i++) {
      hash = ((hash << 5) - hash) + src.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    // Map hash to rotation between -2.5 and 2.5 degrees
    return ((Math.abs(hash) % 50) / 10) - 2.5;
  }, [src]);

  if (!src) return null;

  return (
    <div className={`artifact-polaroid ${className || ''}`} style={{ transform: `rotate(${rotation}deg)` }}>
      <video 
        src={src} 
        controls={controls}
        playsInline={playsInline}
        className="w-full h-auto block"
      />
    </div>
  );
}
