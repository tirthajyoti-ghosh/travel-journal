import { getStoryBySlug } from '@/lib/api';
import { notFound } from 'next/navigation';
import StoryHeader from '@/app/components/StoryHeader';
import StoryBody from '@/app/components/StoryBody';
import StoryFooter from '@/app/components/StoryFooter';
import MapThumbnailWrapper from '@/app/components/MapThumbnailWrapper';

export const dynamic = 'force-dynamic'; // Force runtime rendering

// Calculate reading time (avg 200 words per minute)
function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  const wordCount = text.trim().split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let story;
  
  try {
    // Fetch story at runtime
    story = await getStoryBySlug(slug);
  } catch (e) {
    notFound();
  }

  const readingTime = calculateReadingTime(story.content);

  return (
    <div className="logbook-page">
      {/* Back navigation - Live map thumbnail */}
      <MapThumbnailWrapper 
        coordinates={story.coordinates}
        zoom={2}
      />

      <StoryHeader 
        title={story.title}
        location={story.location}
        date={story.date}
      />

      {/* Media Gallery - Polaroid style */}
      {/* {story.media_item_ids && story.media_item_ids.length > 0 && (
        <div className={`${story.media_item_ids.length === 1 ? 'flex justify-center' : 'media-collage'} px-4`}>
          {story.media_item_ids.map((id, i) => (
            <MediaArtifact
              key={i}
              src={id}
              alt={`${story.title} - Photo ${i + 1}`}
              caption={i === 0 ? story.location : undefined}
            />
          ))}
        </div>
      )} */}

      <StoryBody>
        <div 
          className="story-html-content"
          dangerouslySetInnerHTML={{ __html: story.content }}
        />
      </StoryBody>

      <StoryFooter 
        publishedDate={story.date}
        readingTime={readingTime}
      />
    </div>
  );
}
