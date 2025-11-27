"use client";

import { useEffect, useState, useCallback } from "react";
import GalleryCard from "@/components/gallery/GalleryCard";
import HistoryModal from "@/components/layout/HistoryModal";
import SettingsModal from "@/components/layout/SettingsModal";
import { GalleryInfo } from "@/types";
import { Scroll, Search, History, X, Heart, ChevronDown, ArrowDown, Tag, User, Layers, Type, Languages, Settings } from "lucide-react";
import { useViewerStore } from "@/store/useViewerStore";
import { useInView } from "react-intersection-observer";
import { motion, AnimatePresence } from "framer-motion";

interface GalleryListProps {
    initialGalleries: GalleryInfo[];
}

export default function GalleryList({ initialGalleries }: GalleryListProps) {
    // 초기 데이터를 서버에서 받아온 값으로 설정
    const [galleries, setGalleries] = useState<GalleryInfo[]>(initialGalleries);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    // 실제 API 요청에 사용할 쿼리 (Debounce 처리를 위해 분리 권장되나 여기선 단순화)
    const [activeQuery, setActiveQuery] = useState("");

    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [filterType, setFilterType] = useState<string | null>(null);

    const { ref, inView } = useInView({ threshold: 0, rootMargin: "200px" });
    const { favorites } = useViewerStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // 데이터 가져오기 함수 (검색어 포함)
    const fetchGalleries = useCallback(async (pageNum: number, query: string, isRefresh = false) => {
        if (loading) return;
        setLoading(true);
        try {
            const url = `/api/galleries?page=${pageNum}&limit=24${query ? `&query=${encodeURIComponent(query)}` : ''}`;
            const res = await fetch(url);
            const data: GalleryInfo[] = await res.json();

            if (data.length === 0) {
                setHasMore(false);
            } else {
                setGalleries(prev => {
                    // 새로고침(검색 등)이면 새로운 데이터로 교체, 아니면 추가
                    const newItems = isRefresh ? data : [...prev, ...data];
                    // 중복 제거
                    return Array.from(new Map(newItems.map(item => [item.id, item])).values());
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [loading]);

    // 검색어 변경 시 API 호출 (Enter 키 또는 검색 버튼 클릭 시 실행하도록 UX 변경 추천)
    const handleSearch = () => {
        setPage(1);
        setHasMore(true);
        setGalleries([]); // 리스트 초기화
        setActiveQuery(searchQuery);
        fetchGalleries(1, searchQuery, true);
    };

    // 무한 스크롤 감지
    useEffect(() => {
        if (inView && hasMore && !loading && !showFavoritesOnly) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchGalleries(nextPage, activeQuery);
        }
    }, [inView, hasMore, loading, showFavoritesOnly, page, activeQuery, fetchGalleries]);

    // 즐겨찾기 모드일 때는 favorites 스토어 사용
    const displayItems = showFavoritesOnly ? favorites : galleries;

    // 필터 아이콘 헬퍼
    const getFilterIcon = (type: string) => {
        switch (type) {
            case 'Type': return <Type className="h-3.5 w-3.5" />;
            case 'Artist': return <User className="h-3.5 w-3.5" />;
            case 'Series': return <Layers className="h-3.5 w-3.5" />;
            case 'Tag': return <Tag className="h-3.5 w-3.5" />;
            case 'Language': return <Languages className="h-3.5 w-3.5" />;
            default: return null;
        }
    };

    if (!mounted) return null;

    return (
        <main className="min-h-screen bg-gray-950 text-gray-100 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/80 backdrop-blur-md">
                <div className="container mx-auto flex flex-col gap-3 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                        {/* 로고 */}
                        <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => {
                            setSearchQuery("");
                            setActiveQuery("");
                            setShowFavoritesOnly(false);
                            setPage(1);
                            setGalleries(initialGalleries); // 초기 상태로 복구
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}>
                            <div className="rounded-lg bg-indigo-500/20 p-2">
                                <Scroll className="h-5 w-5 text-indigo-400" />
                            </div>
                            <h1 className="hidden sm:block text-lg font-bold tracking-tight">MangaViewer</h1>
                        </div>

                        {/* 검색창 */}
                        <div className="flex max-w-md flex-1 items-center rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10 focus-within:ring-indigo-500 focus-within:bg-white/10 transition-all">
                            <Search className="h-4 w-4 text-gray-400 mr-2.5 shrink-0" />
                            <input
                                type="text"
                                placeholder="Search title, tag, id..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none"
                            />
                            {searchQuery && (
                                <button onClick={() => {
                                    setSearchQuery("");
                                    setActiveQuery("");
                                    setPage(1);
                                    fetchGalleries(1, "", true);
                                }} className="p-1 hover:bg-white/10 rounded-full">
                                    <X className="h-3.5 w-3.5 text-gray-400 hover:text-white" />
                                </button>
                            )}
                        </div>

                        {/* 우측 버튼 */}
                        <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => setIsSettingsOpen(true)} className="rounded-xl p-2.5 hover:bg-white/10 text-gray-400 transition-colors">
                                <Settings className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => setShowFavoritesOnly(prev => !prev)}
                                className={`rounded-xl p-2.5 transition-all ${showFavoritesOnly ? "bg-red-500/10 text-red-500 ring-1 ring-red-500/50" : "hover:bg-white/10 text-gray-400"}`}
                            >
                                <Heart className={`h-5 w-5 ${showFavoritesOnly ? "fill-red-500" : ""}`} />
                            </button>
                            <button onClick={() => setIsHistoryOpen(true)} className="rounded-xl p-2.5 hover:bg-white/10 text-gray-400 transition-colors">
                                <History className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* 필터 버튼 (생략 가능 또는 기능 연결) */}
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
                        {['Type', 'Language', 'Artist', 'Series', 'Tag'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(filterType === type.toLowerCase() ? null : type.toLowerCase())}
                                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all border ${filterType === type.toLowerCase() ? "bg-indigo-500 text-white border-indigo-500" : "bg-white/5 text-gray-300 border-white/10"}`}
                            >
                                {getFilterIcon(type)}
                                {type}
                                <ChevronDown className="h-3 w-3" />
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Content Grid */}
            <div className="container mx-auto px-4 py-6">
                {showFavoritesOnly && (
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-red-400">
                        <Heart className="fill-red-400 h-6 w-6" />
                        Favorites ({favorites.length})
                    </h2>
                )}

                {displayItems.length === 0 && !loading ? (
                    <div className="flex flex-col items-center justify-center py-32 text-gray-500">
                        <p>No results found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {displayItems.map((gallery) => (
                            <GalleryCard
                                key={gallery.id}
                                info={gallery}
                                onTagClick={(tag) => {
                                    setSearchQuery(tag);
                                    setActiveQuery(tag);
                                    setPage(1);
                                    fetchGalleries(1, tag, true);
                                }}
                            />
                        ))}
                    </div>
                )}

                {!showFavoritesOnly && hasMore && (
                    <div ref={ref} className="mt-12 flex justify-center py-8 min-h-[50px]">
                        {loading && (
                            <div className="flex items-center gap-3 text-gray-400">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                                Loading...
                            </div>
                        )}
                    </div>
                )}
            </div>

            <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            {/* Filter Modal (간소화된 예시) */}
            <AnimatePresence>
                {filterType && (
                    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" onClick={() => setFilterType(null)}>
                        <motion.div className="bg-[#111] border border-white/10 p-6 rounded-t-2xl sm:rounded-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-bold capitalize mb-4">{filterType}</h3>
                            <p className="text-sm text-gray-500">필터 기능은 API와 연동하여 구현이 필요합니다.</p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </main>
    );
}