import { getStoryBySlug, getStorySlugs } from '@/lib/api';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const slugs = getStorySlugs();
  return slugs.map((slug) => ({
    slug: slug.replace(/\.md$/, ''),
  }));
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let story;
  
  try {
    story = getStoryBySlug(slug);
  } catch (e) {
    notFound();
  }

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto font-sans">
      <Link href="/" className="text-blue-500 hover:underline mb-8 block">
        ← Back to Map
      </Link>

      <article className="prose lg:prose-xl">
        <h1 className="text-4xl font-bold mb-2">{story.title}</h1>
        <div className="flex items-center text-gray-500 mb-8 text-sm">
          <span>{story.date}</span>
          <span className="mx-2">•</span>
          <span>{story.location}</span>
        </div>

        {/* Media Placeholder */}
        {story.media_item_ids && story.media_item_ids.length > 0 && (
          <div className="flex gap-4 overflow-x-auto py-4 mb-8">
            {story.media_item_ids.map((id, i) => (
              <div key={i} className="w-64 h-48 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
                {id.startsWith('http') ? (
                  <img src={id} alt={`Media ${i}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    Media {id}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="whitespace-pre-wrap font-serif leading-relaxed">
          {story.content}
        </div>
      </article>
    </main>
  );
}
