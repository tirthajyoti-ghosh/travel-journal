interface StoryFooterProps {
  publishedDate: string;
  readingTime?: number;
}

export default function StoryFooter({ publishedDate, readingTime }: StoryFooterProps) {
  return (
    <footer className="story-footer">
      <div className="footer-stamp" aria-label="Adventure stamp" />
      
      <div className="footer-metadata">
        <span>Published {new Date(publishedDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })}</span>
        
        {readingTime && (
          <>
            <span>•</span>
            <span>{readingTime} min read</span>
          </>
        )}
      </div>
    </footer>
  );
}
