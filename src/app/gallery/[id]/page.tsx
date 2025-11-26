"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import ViewerCanvas from "@/components/viewer/ViewerCanvas";
import ControlOverlay from "@/components/viewer/ControlOverlay";
import { GalleryInfo } from "@/types";

// Mock Data Fetcher
const getGalleryData = (id: string): GalleryInfo => {
    // Generate dummy images
    const images = Array.from({ length: 30 }).map((_, i) => ({
        name: `page-${i + 1}.jpg`,
        width: 1000,
        height: 1500,
    }));

    return {
        id,
        title: `Manga Title ${id}`,
        tags: ["Action", "Fantasy"],
        type: "webtoon",
        files: images,
    };
};

export default function ViewerPage() {
    const params = useParams();
    const id = params.id as string;
    const [data, setData] = useState<GalleryInfo | null>(null);
    const [showOverlay, setShowOverlay] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        // Simulate API call
        const galleryData = getGalleryData(id);
        setData(galleryData);
    }, [id]);

    if (!data) return <div className="flex h-screen items-center justify-center text-white">Loading...</div>;

    // Transform files to src (using placeholder for now)
    const images = data.files.map((file, i) => ({
        src: `https://placehold.co/800x1200/111/white?text=Page+${i + 1}`,
        width: file.width,
        height: file.height,
    }));

    return (
        <main className="relative h-screen w-full overflow-hidden bg-black">
            <ViewerCanvas
                images={images}
                initialPage={currentPage}
                onPageChange={setCurrentPage}
                onToggleOverlay={() => setShowOverlay((prev) => !prev)}
            />

            <ControlOverlay
                visible={showOverlay}
                title={data.title}
                currentPage={currentPage}
                totalPages={images.length}
                onPageChange={setCurrentPage}
            />
        </main>
    );
}
