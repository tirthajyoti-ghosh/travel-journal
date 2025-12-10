import { getAllStories } from '@/lib/api';
import MapWrapper from './components/MapWrapper';

export default function Home() {
  const stories = getAllStories();

  return (
    <main className="h-screen w-screen overflow-hidden">
      <MapWrapper stories={stories} />
      
      {/* Overlay Title */}
      <div className="absolute top-8 left-8 z-10 pointer-events-none">
        <h1 className="text-4xl font-bold text-gray-800 drop-shadow-md font-serif">
          Travel Journal
        </h1>
        <p className="text-gray-700 mt-2 text-lg">Explore the world, one story at a time.</p>
      </div>
    </main>
  );
}
