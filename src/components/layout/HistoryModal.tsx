"use client";

import { useViewerStore } from "@/store/useViewerStore";
import { X, Trash2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GalleryCard from "../gallery/GalleryCard";
import { useEffect, useState } from "react";

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function HistoryModal({ isOpen, onClose }: HistoryModalProps) {
    const { history, clearHistory, removeFromHistory } = useViewerStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    {/* Backdrop - 흐림 제거, 어두움 감소 */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/30" // backdrop-blur 제거됨
                    />

                    {/* Modal Content - 글래스모피즘 적용 */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        // 🚨 핵심 변경: bg-white/5와 backdrop-blur-2xl로 유리 효과 구현
                        className="relative z-[70] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/20 bg-white/5 shadow-2xl shadow-black/50 backdrop-blur-2xl flex flex-col max-h-[85vh]"
                    >
                        {/* Header - 배경 투명도 조절 */}
                        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-4 shrink-0">
                            <div className="flex items-center gap-2 text-white">
                                <Clock className="h-5 w-5 text-indigo-400" />
                                <h2 className="text-lg font-bold">Recent History</h2>
                                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-400">
                                    {history.length}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {history.length > 0 && (
                                    <button
                                        onClick={() => {
                                            if (confirm("모든 기록을 삭제하시겠습니까?")) clearHistory();
                                        }}
                                        className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                                        title="Clear All"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        전체 삭제
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="rounded-full p-2 text-gray-400 hover:bg-white/10 transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Grid */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {history.length === 0 ? (
                                <div className="flex h-64 flex-col items-center justify-center text-gray-500">
                                    <Clock className="h-16 w-16 mb-4 opacity-20" />
                                    <p className="text-lg">최근 본 작품이 없습니다.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                    {history.map((gallery) => (
                                        <div key={gallery.id} className="relative group">
                                            <GalleryCard info={gallery} />

                                            {/* 개별 삭제 버튼 */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeFromHistory(gallery.id);
                                                }}
                                                className="absolute top-2 right-2 z-10 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600 backdrop-blur-md"
                                                title="Remove from history"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}