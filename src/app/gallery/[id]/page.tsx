"use client";

import { useState, useEffect, use } from "react";
import ViewerCanvas from "@/components/viewer/ViewerCanvas";
import ControlOverlay from "@/components/viewer/ControlOverlay";
import { GalleryInfo } from "@/types";
import { useViewerStore } from "@/store/useViewerStore";

export default function ViewerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [data, setData] = useState<GalleryInfo | null>(null);
    const [showOverlay, setShowOverlay] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);

    const { addToHistory } = useViewerStore();

    useEffect(() => {
        fetch(`/api/gallery/${id}`)
            .then(res => {
                if (!res.ok) throw new Error("Failed to load gallery");
                return res.json();
            })
            .then((galleryData) => {
                setData(galleryData);
                addToHistory(galleryData);
            })
            .catch(err => console.error("Error loading gallery:", err));
    }, [id, addToHistory]);

    if (!data) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-950 text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                    <p>Loading Gallery...</p>
                </div>
            </div>
        );
    }

    const images = data.files.map((file) => ({
        src: `/api/image/${id}/${encodeURIComponent(file.name)}`,
        width: file.width || 1000,
        height: file.height || 1500,
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