import { getStoryBySlug, getStorySlugs } from '@/lib/api';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import StoryHeader from '@/app/components/StoryHeader';
import StoryBody from '@/app/components/StoryBody';
import StoryFooter from '@/app/components/StoryFooter';
import MediaArtifact from '@/app/components/MediaArtifact';
import VideoArtifact from '@/app/components/VideoArtifact';
import MapThumbnailWrapper from '@/app/components/MapThumbnailWrapper';

export async function generateStaticParams() {
  const slugs = getStorySlugs();
  return slugs.map((slug) => ({
    slug: slug.replace(/\.(md|html)$/, ''),
  }));
}

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
    story = getStoryBySlug(slug);
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
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            h1: ({ children }) => (
              <h2 className="font-[family-name:var(--font-reenie-beanie)] text-4xl font-normal my-6">
                {children}
              </h2>
            ),
            h2: ({ children }) => (
              <h2 className="font-[family-name:var(--font-reenie-beanie)] text-3xl font-normal my-5">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="font-[family-name:var(--font-patrick-hand)] text-2xl my-4">
                {children}
              </h3>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-[var(--soft-highlight)] pl-6 my-8 italic font-[family-name:var(--font-reenie-beanie)] text-2xl text-[var(--sepia-accent)]">
                {children}
              </blockquote>
            ),
            img: ({ src, alt }) => (
              <MediaArtifact
                src={typeof src === 'string' ? src : ''}
                alt={alt || 'Story image'}
              />
            ),
            video: ({ src, controls, playsInline, className }) => (
              <VideoArtifact
                src={typeof src === 'string' ? src : undefined}
                controls={controls}
                playsInline={playsInline}
                className={className}
              />
            ),
            p: ({ children, node }) => {
              // Check if paragraph only contains an image or video
              const hasMedia = node?.children?.some(
                (child: any) => child.tagName === 'img' || child.tagName === 'video'
              );
              
              // If paragraph only contains media, render as div to avoid nesting issues
              if (hasMedia) {
                return <div className="mb-6">{children}</div>;
              }
              
              return <p className="mb-6 leading-relaxed">{children}</p>;
            },
            ul: ({ children }) => (
              <ul className="list-disc list-inside mb-6 space-y-2">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside mb-6 space-y-2">{children}</ol>
            ),
          }}
        >
          {story.content}
        </ReactMarkdown>
      </StoryBody>

      <StoryFooter 
        publishedDate={story.date}
        readingTime={readingTime}
      />
    </div>
  );
}
