import Link from 'next/link';
import { getAllStories } from '@/lib/api';

export default function Home() {
  const stories = getAllStories();

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto font-sans">
      <h1 className="text-4xl font-bold mb-8 text-center">Travel Journal</h1>
      
      <div className="grid gap-6">
        {stories.map((story) => (
          <Link 
            key={story.slug} 
            href={`/stories/${story.slug}`}
            className="block p-6 border rounded-lg hover:shadow-lg transition-shadow bg-white"
          >
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-2xl font-semibold">{story.title}</h2>
              <span className="text-gray-500 text-sm">{story.date}</span>
            </div>
            <p className="text-gray-600 mb-2">📍 {story.location}</p>
            <div className="flex gap-2">
              {story.tags?.map(tag => (
                <span key={tag} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                  #{tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
