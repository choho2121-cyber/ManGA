"use client";

import { useViewerStore } from "@/store/useViewerStore";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    Settings,
    BookOpen,
    Scroll,
    AlignLeft,
    AlignRight,
    Maximize,
    Minimize,
    ChevronLeft,
} from "lucide-react";
import Link from "next/link";

interface ControlOverlayProps {
    visible: boolean;
    title: string;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function ControlOverlay({
    visible,
    title,
    currentPage,
    totalPages,
    onPageChange,
}: ControlOverlayProps) {
    const {
        viewMode,
        direction,
        fitMode,
        setViewMode,
        setDirection,
        setFitMode,
    } = useViewerStore();

    return (
        <AnimatePresence>
            {visible && (
                <>
                    {/* Top Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: -100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -100 }}
                        transition={{ duration: 0.2 }}
                        className="fixed left-0 top-0 z-50 w-full bg-gradient-to-b from-black/90 to-transparent p-4"
                    >
                        <div className="flex items-center justify-between text-white">
                            <div className="flex items-center gap-4">
                                <Link href="/" className="rounded-full p-2 hover:bg-white/10">
                                    <ArrowLeft className="h-6 w-6" />
                                </Link>
                                <h1 className="truncate text-lg font-medium">{title}</h1>
                            </div>
                            <button className="rounded-full p-2 hover:bg-white/10">
                                <Settings className="h-6 w-6" />
                            </button>
                        </div>
                    </motion.div>

                    {/* Bottom Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-0 left-0 z-50 w-full bg-gradient-to-t from-black/90 to-transparent p-4 pb-8"
                    >
                        <div className="mx-auto max-w-2xl space-y-6 text-white">
                            {/* Progress Slider */}
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium">{currentPage + 1}</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={totalPages - 1}
                                    value={currentPage}
                                    onChange={(e) => onPageChange(parseInt(e.target.value))}
                                    className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-white/20 accent-indigo-500"
                                />
                                <span className="text-sm font-medium">{totalPages}</span>
                            </div>

                            {/* Controls Grid */}
                            <div className="grid grid-cols-3 gap-4 rounded-2xl bg-black/40 p-4 backdrop-blur-md">
                                {/* View Mode */}
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-xs text-gray-400">View Mode</span>
                                    <div className="flex rounded-lg bg-white/10 p-1">
                                        <button
                                            onClick={() => setViewMode("webtoon")}
                                            className={`rounded-md p-2 transition-colors ${viewMode === "webtoon"
                                                    ? "bg-indigo-500 text-white"
                                                    : "text-gray-400 hover:text-white"
                                                }`}
                                        >
                                            <Scroll className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => setViewMode("book")}
                                            className={`rounded-md p-2 transition-colors ${viewMode === "book"
                                                    ? "bg-indigo-500 text-white"
                                                    : "text-gray-400 hover:text-white"
                                                }`}
                                        >
                                            <BookOpen className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Direction (Only for Book Mode) */}
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-xs text-gray-400">Direction</span>
                                    <div className="flex rounded-lg bg-white/10 p-1">
                                        <button
                                            onClick={() => setDirection("ltr")}
                                            disabled={viewMode === "webtoon"}
                                            className={`rounded-md p-2 transition-colors ${direction === "ltr"
                                                    ? "bg-indigo-500 text-white"
                                                    : "text-gray-400 hover:text-white"
                                                } ${viewMode === "webtoon" ? "opacity-30" : ""}`}
                                        >
                                            <AlignLeft className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => setDirection("rtl")}
                                            disabled={viewMode === "webtoon"}
                                            className={`rounded-md p-2 transition-colors ${direction === "rtl"
                                                    ? "bg-indigo-500 text-white"
                                                    : "text-gray-400 hover:text-white"
                                                } ${viewMode === "webtoon" ? "opacity-30" : ""}`}
                                        >
                                            <AlignRight className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Fit Mode */}
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-xs text-gray-400">Fit</span>
                                    <div className="flex rounded-lg bg-white/10 p-1">
                                        <button
                                            onClick={() => setFitMode("width")}
                                            className={`rounded-md p-2 transition-colors ${fitMode === "width"
                                                    ? "bg-indigo-500 text-white"
                                                    : "text-gray-400 hover:text-white"
                                                }`}
                                        >
                                            <Maximize className="h-5 w-5 rotate-90" />
                                        </button>
                                        <button
                                            onClick={() => setFitMode("height")}
                                            className={`rounded-md p-2 transition-colors ${fitMode === "height"
                                                    ? "bg-indigo-500 text-white"
                                                    : "text-gray-400 hover:text-white"
                                                }`}
                                        >
                                            <Minimize className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
