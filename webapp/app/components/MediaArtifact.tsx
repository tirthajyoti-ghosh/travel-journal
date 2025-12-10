import Image from 'next/image';

interface MediaArtifactProps {
  src: string;
  alt: string;
  caption?: string;
}

export default function MediaArtifact({ src, alt, caption }: MediaArtifactProps) {
  return (
    <div className="artifact-polaroid">
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
