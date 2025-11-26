import GalleryCard from "@/components/gallery/GalleryCard";
import { GalleryInfo } from "@/types";
import { Scroll, Book } from "lucide-react";

// Dummy Data Generation
const generateDummyData = (): GalleryInfo[] => {
  return Array.from({ length: 20 }).map((_, i) => ({
    id: `gallery-${i + 1}`,
    title: `Manga Title ${i + 1}`,
    tags: i % 2 === 0 ? ["Action", "Fantasy"] : ["Romance", "Drama"],
    type: i % 3 === 0 ? "webtoon" : "manga",
    files: [], // Files will be populated in viewer
  }));
};

export default function Home() {
  const galleries = generateDummyData();

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Book className="h-6 w-6 text-indigo-500" />
            <h1 className="text-xl font-bold tracking-tight">MangaViewer</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="rounded-full p-2 hover:bg-white/10">
              <Scroll className="h-5 w-5" />
            </button>
            <div className="h-8 w-8 rounded-full bg-indigo-500/20" />
          </div>
        </div>
      </header>

      {/* Gallery Grid */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {galleries.map((gallery) => (
            <GalleryCard key={gallery.id} info={gallery} />
          ))}
        </div>
      </div>
    </main>
  );
}
