"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import GalleryCard from "@/components/gallery/GalleryCard";
import HistoryModal from "@/components/layout/HistoryModal";
import SettingsModal from "@/components/layout/SettingsModal";
import { GalleryInfo } from "@/types";
import { Scroll, Search, History, X, Heart, Settings } from "lucide-react";
import { useViewerStore } from "@/store/useViewerStore";
import { useInView } from "react-intersection-observer";
import { AnimatePresence } from "framer-motion";

type ApiResponse =
  | { data: GalleryInfo[]; pagination: { total: number; page: number; limit: number; hasMore: boolean; }; }
  | GalleryInfo[]
  | { error: string };

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const {
    favorites,
    homeGalleries, homePage, homeHasMore, homeScrollY,
    setHomeState, addHomeGalleries, resetHomeState,
    preferences
  } = useViewerStore();

  const { ref, inView } = useInView({ threshold: 0, rootMargin: "1000px" });
  const [mounted, setMounted] = useState(false);
  const isRestored = useRef(false);
  const retryCount = useRef(0);
  const MAX_RETRIES = 10;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (preferences.defaultSearchQuery && searchQuery === "" && homeGalleries.length === 0) {
      setSearchQuery(preferences.defaultSearchQuery);
    }

    if (homeGalleries.length === 0) {
      // [수정] 초기 로드 시에는 저장된 기본 쿼리 또는 빈 값 사용
      fetchGalleries(1, preferences.defaultSearchQuery || "");
    } else if (!isRestored.current) {
      setTimeout(() => {
        window.scrollTo({ top: homeScrollY, behavior: "instant" });
        isRestored.current = true;
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, JSON.stringify(preferences)]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) setHomeState({ homeScrollY: window.scrollY });
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [setHomeState]);

  // [수정] queryOverride 인자 추가
  const fetchGalleries = async (pageNum: number, queryOverride?: string) => {
    if (loading || (!homeHasMore && pageNum !== 1)) return;
    setLoading(true);
    try {
      const limit = preferences.galleryLoadLimit || 25;
      const params = new URLSearchParams();

      params.set('page', pageNum.toString());
      params.set('limit', limit.toString());

      // Preferences Settings
      if (preferences.defaultType?.length > 0) {
        preferences.defaultType.forEach(type => params.append('type', type));
      }
      if (preferences.preferredLanguage?.length > 0) {
        preferences.preferredLanguage.forEach(lang => params.append('language', lang));
      }
      if (preferences.preferredTags?.length > 0) {
        preferences.preferredTags.forEach(tag => {
          if (tag.includes(':')) {
            const [key, val] = tag.split(':');
            if (key === 'male' || key === 'female') {
              params.append('tag', tag);
            } else {
              params.append(key, val);
            }
          } else {
            params.append('tag', tag);
          }
        });
      }
      if (preferences.excludedTags?.length > 0) {
        preferences.excludedTags.forEach(tag => {
          if (tag.includes(':')) {
            const [key, val] = tag.split(':');
            if (key === 'male' || key === 'female') {
              params.append('exclude_tag', tag);
            } else {
              params.append(`exclude_${key}`, val);
            }
          } else {
            params.append('exclude_tag', tag);
          }
        });
      }
      if (preferences.excludeBL) {
        params.append('exclude_tag', 'male:yaoi');
        params.append('exclude_tag', 'male:shonen ai');
      }
      if (preferences.excludeGore) {
        params.append('exclude_tag', 'guro');
      }

      // [핵심] 쿼리 우선순위: Override > State
      const currentQuery = queryOverride !== undefined ? queryOverride : searchQuery;

      if (currentQuery.trim()) {
        const terms = currentQuery.trim().split(/\s+/);
        terms.forEach(term => {
          if (term.includes(':')) {
            const [key, val] = term.split(':');
            if (key === 'male' || key === 'female') {
              params.append('tag', term);
            } else {
              params.append(key, val);
            }
          } else {
            params.append('tag', term);
          }
        });
      }

      const res = await fetch(`/api/galleries?${params.toString()}`);

      if (!res.ok) {
        console.error(`API Error: ${res.status}`);
        setLoading(false);
        return;
      }

      const response: ApiResponse = await res.json();

      let newData: GalleryInfo[] = [];
      let hasMore = false;

      if (Array.isArray(response)) {
        newData = response;
        hasMore = newData.length === limit;
      } else if ('data' in response && 'pagination' in response) {
        newData = response.data;
        hasMore = response.pagination.hasMore;
      }

      if (newData.length === 0) {
        if (hasMore && retryCount.current < MAX_RETRIES) {
          console.log(`Page ${pageNum} is empty, skipping...`);
          retryCount.current += 1;
          // 재귀 호출 시에도 쿼리 유지
          await fetchGalleries(pageNum + 1, currentQuery);
          return;
        } else {
          setHomeState({ homeHasMore: false });
        }
      } else {
        retryCount.current = 0;
        addHomeGalleries(newData);
        setHomeState({ homePage: pageNum, homeHasMore: hasMore });
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // [수정] newQuery 인자 추가
  const handleRefresh = (newQuery?: string) => {
    // 상태 업데이트 (비동기)
    if (newQuery !== undefined) setSearchQuery(newQuery);

    resetHomeState();
    retryCount.current = 0;
    window.scrollTo({ top: 0, behavior: "instant" });

    // API 호출 시 newQuery를 직접 전달 (즉시 반영)
    // newQuery가 undefined면(그냥 엔터) 현재 상태(searchQuery)를 사용해야 하는데,
    // 이 시점엔 아직 상태 업데이트 전일 수 있으므로 주의.
    // handleRefresh(str) -> str 사용
    // handleRefresh() -> 현재 searchQuery 사용
    setTimeout(() => fetchGalleries(1, newQuery), 0);
  };

  useEffect(() => {
    if (inView && homeHasMore && !loading && !showFavoritesOnly && homeGalleries.length > 0) {
      fetchGalleries(homePage + 1);
    }
  }, [inView, homeHasMore, loading, showFavoritesOnly, homeGalleries.length, homePage]);

  const displayGalleries = useMemo(() => {
    const source = showFavoritesOnly ? favorites : homeGalleries;
    return source.filter(g => {
      if (showFavoritesOnly) {
        const tagsToExclude = [...(preferences.excludedTags || [])];
        if (preferences.excludeBL) tagsToExclude.push('male:yaoi', 'male:shonen ai');
        if (preferences.excludeGore) tagsToExclude.push('guro');

        if (tagsToExclude.length > 0) {
          if (g.tags.some(tag => tagsToExclude.includes(tag))) return false;
        }

        const lowerQuery = searchQuery.toLowerCase();
        if (lowerQuery) {
          const matchesTitle = g.title.toLowerCase().includes(lowerQuery);
          const matchesId = g.id.includes(lowerQuery);
          const matchesTags = g.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
          if (!matchesTitle && !matchesId && !matchesTags) return false;
        }
      }
      return true;
    });
  }, [homeGalleries, favorites, showFavoritesOnly, searchQuery, preferences]);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 pb-20">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-screen-2xl w-full px-6 py-3">
          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => handleRefresh("")}>
              <div className="rounded-lg bg-indigo-500/20 p-2">
                <Scroll className="h-5 w-5 text-indigo-400" />
              </div>
              <h1 className="hidden sm:block text-lg font-bold tracking-tight">MangaViewer</h1>
            </div>

            <div className="flex max-w-md flex-1 items-center rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10 focus-within:ring-indigo-500 focus-within:bg-white/10 transition-all">
              <Search className="h-4 w-4 text-gray-400 mr-2.5 shrink-0" />
              <input
                type="text"
                placeholder="Search tags"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRefresh(searchQuery)}
                className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); handleRefresh(""); }} className="p-1 hover:bg-white/10 rounded-full">
                  <X className="h-3.5 w-3.5 text-gray-400 hover:text-white" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setIsSettingsOpen(true)} className="rounded-xl p-2.5 hover:bg-white/10 text-gray-400 transition-colors relative">
                <Settings className="h-5 w-5" />
                {(preferences.defaultType?.length > 0 || preferences.preferredLanguage?.length > 0 || preferences.excludeBL || preferences.excludeGore) && (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-indigo-500 border border-black" />
                )}
              </button>
              <button onClick={() => setShowFavoritesOnly(prev => !prev)} className={`rounded-xl p-2.5 transition-all ${showFavoritesOnly ? "bg-red-500/10 text-red-500 ring-1 ring-red-500/50" : "hover:bg-white/10 text-gray-400"}`}>
                <Heart className={`h-5 w-5 ${showFavoritesOnly ? "fill-red-500" : ""}`} />
              </button>
              <button onClick={() => setIsHistoryOpen(true)} className="rounded-xl p-2.5 hover:bg-white/10 text-gray-400 transition-colors">
                <History className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-screen-2xl w-full px-6 py-6">
        {showFavoritesOnly && (
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-red-400">
            <Heart className="fill-red-400 h-6 w-6" /> Favorites <span className="text-sm font-normal text-gray-500 ml-2">({favorites.length})</span>
          </h2>
        )}

        {displayGalleries.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-500">
            <div className="rounded-full bg-white/5 p-6 mb-4"><Search className="h-10 w-10 opacity-40" /></div>
            <p className="text-lg font-medium">No results found</p>
            <p className="text-sm opacity-60">{showFavoritesOnly ? "No favorite items." : "Try changing your settings or search query."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {displayGalleries.map((gallery) => (
              // [수정] 태그 클릭 시 handleRefresh(tag) 호출
              <GalleryCard key={gallery.id} info={gallery} onTagClick={(tag) => handleRefresh(tag)} />
            ))}
          </div>
        )}

        {!showFavoritesOnly && homeHasMore && (
          <div ref={ref} className="mt-4 h-20 w-full flex items-center justify-center opacity-50 pointer-events-none">
            {loading && <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />}
          </div>
        )}
      </div>

      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => { setIsSettingsOpen(false); handleRefresh(); }} />
    </main>
  );
}