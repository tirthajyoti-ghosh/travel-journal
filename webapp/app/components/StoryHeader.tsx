interface StoryHeaderProps {
  title: string;
  location: string;
  date: string;
}

export default function StoryHeader({ title, location, date }: StoryHeaderProps) {
  return (
    <header className="story-header">
      <h1 className="story-title">{title}</h1>
      
      <div className="story-metadata">
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <span>{location}</span>
        
        <span>•</span>
        
        <time dateTime={date}>{new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</time>
      </div>
      
      <div className="ink-divider" aria-hidden="true" />
    </header>
  );
}
