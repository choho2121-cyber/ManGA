"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useViewerStore } from "@/store/useViewerStore";
import { useInView } from "react-intersection-observer";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/Skeleton";

interface ViewerCanvasProps {
    images: { src: string; width: number; height: number }[];
    initialPage?: number;
    onPageChange?: (page: number) => void;
    onToggleOverlay?: () => void;
}

export default function ViewerCanvas({
    images,
    initialPage = 0,
    onPageChange,
    onToggleOverlay,
}: ViewerCanvasProps) {
    const { viewMode, direction, fitMode } = useViewerStore();
    const [currentPage, setCurrentPage] = useState(initialPage);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync internal state with prop
    useEffect(() => {
        if (onPageChange) {
            onPageChange(currentPage);
        }
    }, [currentPage, onPageChange]);

    // Handle Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (viewMode === "book") {
                if (e.key === "ArrowRight") {
                    setCurrentPage((prev) =>
                        direction === "ltr"
                            ? Math.min(prev + 1, images.length - 1)
                            : Math.max(prev - 1, 0)
                    );
                } else if (e.key === "ArrowLeft") {
                    setCurrentPage((prev) =>
                        direction === "ltr"
                            ? Math.max(prev - 1, 0)
                            : Math.min(prev + 1, images.length - 1)
                    );
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [viewMode, direction, images.length]);

    // Webtoon Mode: Scroll handling to update current page
    // Note: For a real app, we'd use IntersectionObserver on each image to update page number

    if (viewMode === "webtoon") {
        return (
            <div
                ref={containerRef}
                className="min-h-screen w-full bg-gray-900"
                onClick={onToggleOverlay}
            >
                <div className="mx-auto flex max-w-3xl flex-col">
                    {images.map((img, index) => (
                        <WebtoonImage key={index} src={img.src} index={index} />
                    ))}
                </div>
            </div>
        );
    }

    // Book Mode
    return (
        <div
            className="relative flex h-screen w-full items-center justify-center bg-gray-900 overflow-hidden"
            onClick={onToggleOverlay}
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={currentPage}
                    initial={{ opacity: 0, x: direction === "ltr" ? 50 : -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction === "ltr" ? -50 : 50 }}
                    transition={{ duration: 0.2 }}
                    className={`relative ${fitMode === "height" ? "h-full w-auto" : "w-full h-auto"
                        } max-h-screen max-w-full p-4`}
                >
                    <div className="relative h-full w-full flex items-center justify-center">
                        {/* In a real app, we would use Next/Image with proper sizing. 
                 For book mode 'fit height', we want the image to be contained. */}
                        <img
                            src={images[currentPage].src}
                            alt={`Page ${currentPage + 1}`}
                            className={`max-h-full max-w-full object-contain shadow-2xl`}
                            style={{
                                maxHeight: '100vh',
                                maxWidth: '100vw'
                            }}
                        />
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

function WebtoonImage({ src, index }: { src: string; index: number }) {
    const { ref, inView } = useInView({
        triggerOnce: true,
        rootMargin: "200px 0px", // Preload 200px before
    });

    return (
        <div ref={ref} className="relative w-full min-h-[500px]">
            {inView ? (
                <img src={src} alt={`Page ${index + 1}`} className="w-full h-auto block" loading="lazy" />
            ) : (
                <Skeleton className="h-[800px] w-full" />
            )}
        </div>
    );
}
