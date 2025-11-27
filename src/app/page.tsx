"use client";

import { useEffect, useState, useMemo } from "react";
import GalleryCard from "@/components/gallery/GalleryCard";
import HistoryModal from "@/components/layout/HistoryModal";
import SettingsModal from "@/components/layout/SettingsModal";
import { GalleryInfo } from "@/types";
import { Scroll, Search, History, X, Heart, ChevronDown, ArrowDown, Tag, User, Layers, Type, Languages, Settings } from "lucide-react";
import { useViewerStore } from "@/store/useViewerStore";
import { useInView } from "react-intersection-observer";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [galleries, setGalleries] = useState<GalleryInfo[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const [filterType, setFilterType] = useState<string | null>(null);

  const { ref, inView } = useInView({ threshold: 0, rootMargin: "200px" });
  const { favorites, preferences } = useViewerStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const fetchGalleries = async (pageNum: number) => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/galleries?page=${pageNum}&limit=24`);
      const data: GalleryInfo[] = await res.json();
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setGalleries(prev => {
          const newItems = pageNum === 1 ? data : [...prev, ...data];
          return Array.from(new Map(newItems.map((item: GalleryInfo) => [item.id, item])).values());
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGalleries(1); }, []);

  useEffect(() => {
    if (inView && hasMore && !loading && !showFavoritesOnly) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchGalleries(nextPage);
    }
  }, [inView, hasMore, loading, showFavoritesOnly]);

  const uniqueData = useMemo(() => {
    const source = showFavoritesOnly ? favorites : galleries;
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
  }, [galleries, favorites, showFavoritesOnly]);

  const displayGalleries = useMemo(() => {
    const source = showFavoritesOnly ? favorites : galleries;

    const lowerQuery = searchQuery.toLowerCase();
    const hasPrefix = lowerQuery.includes(':');

    const applyDefaultType = preferences.defaultType && !lowerQuery.includes('type:');
    const applyDefaultLang = preferences.preferredLanguage && !lowerQuery.includes('lang:') && !lowerQuery.includes('language:');

    const hasPreferredTags = preferences.preferredTags && preferences.preferredTags.length > 0;
    const hasExcludedTags = preferences.excludedTags && preferences.excludedTags.length > 0;

    return source.filter(g => {
      if (hasExcludedTags) {
        const isExcluded = g.tags.some(tag => preferences.excludedTags.includes(tag));
        if (isExcluded) return false;
      }

      if (!searchQuery && hasPreferredTags) {
        const isPreferred = g.tags.some(tag => preferences.preferredTags.includes(tag));
        if (!isPreferred) return false;
      }

      if (applyDefaultType && g.type !== preferences.defaultType) return false;
      if (applyDefaultLang && g.language !== preferences.preferredLanguage) return false;

      if (!searchQuery) return true;

      if (hasPrefix) {
        const [key, value] = lowerQuery.split(':').map(s => s.trim());
        if (!value) return true;
        if (key === 'type') return g.type?.toLowerCase() === value;
        if (key === 'lang' || key === 'language') return g.language?.toLowerCase() === value;
        if (key === 'artist') return g.artists?.some(a => a.toLowerCase().includes(value));
        if (key === 'series') return g.series?.some(s => s.toLowerCase().includes(value));
        if (key === 'tag') return g.tags.some(t => t.toLowerCase().includes(value));
      }

      return (
        g.title.toLowerCase().includes(lowerQuery) ||
        g.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        g.id.includes(lowerQuery)
      );
    });
  }, [galleries, favorites, showFavoritesOnly, searchQuery, preferences]);

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

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/80 backdrop-blur-md">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-3">
          {/* Top Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => {
              setSearchQuery("");
              setShowFavoritesOnly(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
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
                onClick={() => setIsSettingsOpen(true)}
                className="rounded-xl p-2.5 hover:bg-white/10 text-gray-400 transition-colors"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
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
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            {['Type', 'Language', 'Artist', 'Series', 'Tag'].map((type) => {
              const isActive = filterType === type.toLowerCase();
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(isActive ? null : type.toLowerCase())}
                  className={`
                                flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all border
                                ${isActive
                      ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20"
                      : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:border-white/20"
                    }
                            `}
                >
                  {getFilterIcon(type)}
                  {type}
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isActive ? "rotate-180" : ""}`} />
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
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
            <p className="text-sm opacity-60">
              {/* 메시지 조건부 표시 */}
              {(preferences.defaultType || preferences.preferredLanguage || preferences.preferredTags?.length > 0 || preferences.excludedTags?.length > 0)
                ? "Check your preference settings (filters are active)"
                : "Try searching for something else"
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {displayGalleries.map((gallery) => (
              <GalleryCard
                key={gallery.id}
                info={gallery}
                onTagClick={(tag) => setSearchQuery(tag)}
              />
            ))}
          </div>
        )}

        {!showFavoritesOnly && hasMore && (
          <div ref={ref} className="mt-12 flex justify-center py-8 min-h-[50px]">
            {loading && (
              <div className="flex items-center gap-3 text-gray-400 bg-white/5 px-5 py-2 rounded-full">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                <span className="text-sm font-medium">Loading more...</span>
              </div>
            )}
          </div>
        )}
      </div>

      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Filter Modal (Design preserved) */}
      <AnimatePresence>
        {filterType && (
          <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setFilterType(null)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-t-3xl sm:rounded-2xl bg-[#111] border border-white/10 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-indigo-500/20 p-2 text-indigo-400">
                    {getFilterIcon(filterType.charAt(0).toUpperCase() + filterType.slice(1))}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold capitalize text-white leading-none">{filterType}</h3>
                    <p className="text-xs text-gray-500 mt-1">Select to filter</p>
                  </div>
                </div>
                <button onClick={() => setFilterType(null)} className="p-2 rounded-full hover:bg-white/10 text-gray-400 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {/* @ts-ignore */}
                {uniqueData[filterType]?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {/* @ts-ignore */}
                    {uniqueData[filterType].map((item: string) => (
                      <button
                        key={item}
                        onClick={() => {
                          const key = filterType === 'language' ? 'lang' : filterType;
                          setSearchQuery(`${key}:${item}`);
                          setFilterType(null);
                        }}
                        className="group flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all text-left"
                      >
                        <span className="text-sm text-gray-300 group-hover:text-white truncate pr-2 font-medium">{item}</span>
                        <ArrowDown className="h-3 w-3 text-gray-600 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 -rotate-90 transition-all" />
                      </button>
                    ))}
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