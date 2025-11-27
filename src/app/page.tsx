"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import GalleryCard from "@/components/gallery/GalleryCard";
import HistoryModal from "@/components/layout/HistoryModal";
import { GalleryInfo } from "@/types";
import { Scroll, Search, History, X, Heart, ChevronDown, Check, Filter } from "lucide-react";
import { useViewerStore } from "@/store/useViewerStore";
import { useInView } from "react-intersection-observer";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Store에서 상태 및 액션 가져오기
  const {
    favorites, filters, toggleFilter, clearFilters,
    homeGalleries, homePage, homeHasMore, homeScrollY,
    setHomeState, addHomeGalleries, resetHomeState
  } = useViewerStore();

  const { ref, inView } = useInView({ threshold: 0, rootMargin: "2000px" });
  const [mounted, setMounted] = useState(false);

  // 스크롤 복원 처리를 위한 플래그
  const isRestored = useRef(false);

  useEffect(() => {
    setMounted(true);

    // 마운트 시 데이터가 있고 검색/필터 변경이 아닌 경우 스크롤 복원 시도
    if (homeGalleries.length > 0 && !isRestored.current) {
      setTimeout(() => {
        window.scrollTo({ top: homeScrollY, behavior: "instant" });
        isRestored.current = true;
      }, 100); // 렌더링 후 약간의 딜레이
    } else if (homeGalleries.length === 0) {
      // 데이터가 없으면 첫 페이지 로드
      fetchGalleries(1);
    }
  }, []);

  // 스크롤 위치 저장 (Debounce 없이 간단하게 구현, 필요시 최적화)
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setHomeState({ homeScrollY: window.scrollY });
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [setHomeState]);

  const fetchGalleries = async (pageNum: number) => {
    if (loading || (!homeHasMore && pageNum !== 1)) return;
    setLoading(true);
    try {
      // API 호출
      const res = await fetch(`/api/galleries?page=${pageNum}&limit=18`);
      const data: GalleryInfo[] = await res.json();

      if (data.length === 0) {
        setHomeState({ homeHasMore: false });
      } else {
        addHomeGalleries(data);
        setHomeState({ homePage: pageNum });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 검색어나 필터가 바뀌면 리셋 후 새로 로드
  const handleSearchOrFilterChange = (newQuery?: string, resetFilters: boolean = false) => {
    if (newQuery !== undefined) setSearchQuery(newQuery);
    if (resetFilters) clearFilters();

    // 상태 초기화 및 첫 페이지 로드
    resetHomeState();
    window.scrollTo({ top: 0, behavior: "instant" });
    setTimeout(() => fetchGalleries(1), 0);
  };

  // 무한 스크롤 트리거
  useEffect(() => {
    if (inView && homeHasMore && !loading && !showFavoritesOnly && homeGalleries.length > 0) {
      fetchGalleries(homePage + 1);
    }
  }, [inView, homeHasMore, loading, showFavoritesOnly, homeGalleries.length, homePage]);

  // 화면 표시용 필터링
  const uniqueData = useMemo(() => {
    const source = showFavoritesOnly ? favorites : homeGalleries;
    const data = {
      artist: new Set<string>(),
      series: new Set<string>(),
      type: new Set<string>(),
      tag: new Set<string>(),
      language: new Set<string>(),
    };
    source.forEach(g => {
      if (g.artists) g.artists.forEach(a => data.artist.add(a));
      if (g.series) g.series.forEach(s => data.series.add(s));
      if (g.type) data.type.add(g.type);
      if (g.tags) g.tags.forEach(t => data.tag.add(t));
      if (g.language) data.language.add(g.language);
    });
    return {
      artist: Array.from(data.artist).sort(),
      series: Array.from(data.series).sort(),
      type: Array.from(data.type).sort(),
      tag: Array.from(data.tag).sort(),
      language: Array.from(data.language).sort(),
    };
  }, [homeGalleries, favorites, showFavoritesOnly]);

  const displayGalleries = useMemo(() => {
    const source = showFavoritesOnly ? favorites : homeGalleries;

    return source.filter(g => {
      const lowerQuery = searchQuery.toLowerCase();
      if (lowerQuery) {
        const matchesTitle = g.title.toLowerCase().includes(lowerQuery);
        const matchesId = g.id.includes(lowerQuery);
        const matchesTags = g.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
        if (!matchesTitle && !matchesId && !matchesTags) return false;
      }

      const { types, languages, artists, series, tags } = filters;

      if (types.length > 0 && !types.includes(g.type)) return false;
      if (languages.length > 0 && (!g.language || !languages.includes(g.language))) return false;
      if (artists.length > 0 && !g.artists?.some(a => artists.includes(a))) return false;
      if (series.length > 0 && !g.series?.some(s => series.includes(s))) return false;
      if (tags.length > 0 && !g.tags.some(t => tags.includes(t))) return false;

      return true;
    });
  }, [homeGalleries, favorites, showFavoritesOnly, searchQuery, filters]);

  const getStoreKey = (category: string) => {
    switch (category.toLowerCase()) {
      case 'type': return 'types';
      case 'language': return 'languages';
      case 'artist': return 'artists';
      case 'series': return 'series';
      case 'tag': return 'tags';
      default: return 'tags';
    }
  };

  if (!mounted) return null; // Hydration 불일치 방지

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-screen-2xl w-full flex flex-col gap-3 px-6 py-3">
          {/* Top Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => {
              handleSearchOrFilterChange("", true);
            }}>
              <div className="rounded-lg bg-indigo-500/20 p-2">
                <Scroll className="h-5 w-5 text-indigo-400" />
              </div>
              <h1 className="hidden sm:block text-lg font-bold tracking-tight">MangaViewer</h1>
            </div>

            <div className="flex max-w-md flex-1 items-center rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10 focus-within:ring-indigo-500 focus-within:bg-white/10 transition-all">
              <Search className="h-4 w-4 text-gray-400 mr-2.5 shrink-0" />
              <input
                type="text"
                placeholder="Search title, tag, id..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // 엔터키 입력 시 검색 적용 (기존 데이터 유지하면서 필터링만 할지, 새로 검색할지 결정)
                    // 여기서는 displayGalleries가 필터링하므로 별도 로직 불필요
                  }
                }}
                className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="p-1 hover:bg-white/10 rounded-full">
                  <X className="h-3.5 w-3.5 text-gray-400 hover:text-white" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowFavoritesOnly(prev => !prev)}
                className={`rounded-xl p-2.5 transition-all ${showFavoritesOnly ? "bg-red-500/10 text-red-500 ring-1 ring-red-500/50" : "hover:bg-white/10 text-gray-400"}`}
                title="Favorites"
              >
                <Heart className={`h-5 w-5 ${showFavoritesOnly ? "fill-red-500" : ""}`} />
              </button>
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="rounded-xl p-2.5 hover:bg-white/10 text-gray-400 transition-colors"
                title="History"
              >
                <History className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Bottom Row: Filters */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-6 px-6 sm:mx-0 sm:px-0">
            <div className="flex items-center gap-2 pr-2 border-r border-white/10">
              <Filter className="h-4 w-4 text-gray-500" />
              {Object.values(filters).flat().length > 0 && (
                <button onClick={() => handleSearchOrFilterChange(undefined, true)} className="text-xs text-red-400 hover:text-red-300 font-medium">
                  Reset
                </button>
              )}
            </div>
            {['Type', 'Language', 'Artist', 'Series', 'Tag'].map((category) => {
              const storeKey = getStoreKey(category);
              // @ts-ignore
              const activeCount = filters[storeKey]?.length || 0;
              const isActive = activeCount > 0;
              const isOpen = filterCategory === category.toLowerCase();

              return (
                <button
                  key={category}
                  onClick={() => setFilterCategory(isOpen ? null : category.toLowerCase())}
                  className={`
                    flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all border
                    ${isActive || isOpen
                      ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20"
                      : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:border-white/20"
                    }
                  `}
                >
                  {category}
                  {isActive && <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">{activeCount}</span>}
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-screen-2xl w-full px-6 py-6">
        {showFavoritesOnly && (
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-red-400">
            <Heart className="fill-red-400 h-6 w-6" />
            Favorites
            <span className="text-sm font-normal text-gray-500 ml-2">({favorites.length})</span>
          </h2>
        )}

        {displayGalleries.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-500">
            <div className="rounded-full bg-white/5 p-6 mb-4">
              <Search className="h-10 w-10 opacity-40" />
            </div>
            <p className="text-lg font-medium">No results found</p>
            <p className="text-sm opacity-60">Try changing your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
            {displayGalleries.map((gallery) => (
              <GalleryCard
                key={gallery.id}
                info={gallery}
                onTagClick={(tag) => setSearchQuery(tag)}
              />
            ))}
          </div>
        )}

        {/* Loading More / Sentinel */}
        {!showFavoritesOnly && homeHasMore && (
          <div ref={ref} className="mt-4 h-20 w-full opacity-0 pointer-events-none" />
        )}
      </div>

      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

      <AnimatePresence>
        {filterCategory && (
          <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setFilterCategory(null)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-t-3xl sm:rounded-2xl bg-[#111] border border-white/10 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-indigo-500/20 p-2 text-indigo-400">
                    <Filter className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold capitalize text-white leading-none">{filterCategory}</h3>
                    <p className="text-xs text-gray-500 mt-1">Select multiple items to filter</p>
                  </div>
                </div>
                <button onClick={() => setFilterCategory(null)} className="p-2 rounded-full hover:bg-white/10 text-gray-400 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {/* @ts-ignore */}
                {uniqueData[filterCategory]?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {/* @ts-ignore */}
                    {uniqueData[filterCategory].map((item: string) => {
                      const storeKey = getStoreKey(filterCategory);
                      // @ts-ignore
                      const isSelected = filters[storeKey]?.includes(item);

                      return (
                        <button
                          key={item}
                          onClick={() => {
                            // @ts-ignore
                            toggleFilter(storeKey, item);
                          }}
                          className={`
                                group flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left
                                ${isSelected
                              ? "bg-indigo-600 border-indigo-500 text-white shadow-md"
                              : "bg-white/5 border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-gray-300"
                            }
                            `}
                        >
                          <span className="text-sm truncate pr-2 font-medium">{item}</span>
                          {isSelected && <Check className="h-4 w-4 text-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <p>No items found in current view</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}