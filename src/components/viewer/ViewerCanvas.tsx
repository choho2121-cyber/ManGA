"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useViewerStore } from "@/store/useViewerStore";
import { useInView } from "react-intersection-observer";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
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
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // 페이지 변경 시 상위 컴포넌트에 알림
    useEffect(() => {
        onPageChange?.(currentPage);
    }, [currentPage, onPageChange]);

    // [북 모드] 페이지 이동 로직
    const paginate = useCallback((newDirection: number) => {
        setCurrentPage((prev) => {
            // LTR: +1 = 다음장, RTL: -1 = 다음장 (시각적 이동 기준)
            const nextIndex = direction === 'ltr' ? prev + newDirection : prev - newDirection;
            return Math.max(0, Math.min(nextIndex, images.length - 1));
        });
    }, [direction, images.length]);

    // [북 모드] 키보드 조작
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (viewMode !== "book") return;
            if (e.key === "ArrowRight") paginate(1);
            if (e.key === "ArrowLeft") paginate(-1);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [viewMode, paginate]);

    // [북 모드] 스와이프 제스처
    const onDragEnd = (e: any, { offset, velocity }: PanInfo) => {
        const swipeThreshold = 100;
        if (offset.x < -swipeThreshold) paginate(1); // 오른쪽 -> 왼쪽 (다음)
        else if (offset.x > swipeThreshold) paginate(-1); // 왼쪽 -> 오른쪽 (이전)
    };

    // [웹툰 모드] 스크롤 감지하여 현재 페이지 업데이트 (옵션)
    // 구현 복잡도를 낮추기 위해 여기서는 생략하거나, 필요시 IntersectionObserver 추가 가능

    // --- 렌더링: 웹툰 모드 (세로 스크롤) ---
    if (viewMode === "webtoon") {
        return (
            <div
                ref={scrollContainerRef}
                // 🚨 핵심 수정: h-full과 overflow-y-auto를 줘서 스크롤 가능하게 만듦
                className="h-full w-full overflow-y-auto bg-gray-900"
                onClick={(e) => {
                    // 이미지 클릭 시에만 오버레이 토글 (배경 클릭 방지 등은 선택사항)
                    onToggleOverlay?.();
                }}
            >
                <div className="mx-auto flex max-w-3xl flex-col bg-black min-h-full">
                    {images.map((img, index) => (
                        <WebtoonImage key={index} image={img} index={index} />
                    ))}
                    {/* 마지막 여백 */}
                    <div className="h-32 w-full bg-transparent" />
                </div>
            </div>
        );
    }

    // --- 렌더링: 북 모드 (한 장씩 보기) ---
    return (
        <div className="relative flex h-screen w-full items-center justify-center bg-gray-900 overflow-hidden">
            {/* 클릭 네비게이션 영역 (투명 버튼) */}
            <div className="absolute inset-0 z-10 flex">
                <div className="w-[30%] h-full cursor-pointer" onClick={() => paginate(-1)} title="Previous Page" />
                <div className="w-[40%] h-full cursor-pointer" onClick={onToggleOverlay} title="Menu" />
                <div className="w-[30%] h-full cursor-pointer" onClick={() => paginate(1)} title="Next Page" />
            </div>

            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={currentPage}
                    initial={{ opacity: 0, x: direction === "ltr" ? 100 : -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction === "ltr" ? -100 : 100 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={1}
                    onDragEnd={onDragEnd}
                    className={`relative z-0 ${fitMode === "height" ? "h-full w-auto" : "w-full h-auto"
                        } flex items-center justify-center p-0 sm:p-2`}
                >
                    {/* 이미지 컨테이너 */}
                    <div className="relative h-full w-full flex items-center justify-center">
                        <Image
                            src={images[currentPage].src}
                            alt={`Page ${currentPage + 1}`}
                            width={images[currentPage].width}
                            height={images[currentPage].height}
                            className="max-h-screen max-w-full object-contain select-none"
                            priority
                            unoptimized={true} // 로컬 API 이미지 깨짐 방지
                        />
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// 웹툰 이미지 컴포넌트 (Lazy Loading)
function WebtoonImage({ image, index }: { image: { src: string; width: number; height: number }; index: number }) {
    const { ref, inView } = useInView({
        triggerOnce: true,
        rootMargin: "50% 0px", // 미리 로딩 범위
    });

    return (
        <div ref={ref} className="relative w-full bg-gray-800" style={{ aspectRatio: `${image.width}/${image.height}` }}>
            {inView ? (
                <Image
                    src={image.src}
                    alt={`Page ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 800px"
                    unoptimized={true} // 로컬 API 이미지 깨짐 방지
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-500">
                    <Skeleton className="h-full w-full bg-gray-800/50" />
                    <span className="absolute text-xs">Page {index + 1}</span>
                </div>
            )}
        </div>
    );
}