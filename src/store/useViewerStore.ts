import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GalleryInfo } from "@/types";

interface FilterState {
    types: string[];
    languages: string[];
    artists: string[];
    series: string[];
    tags: string[];
}

interface ViewerState {
    viewMode: 'webtoon' | 'book';
    direction: 'ltr' | 'rtl';
    fitMode: 'width' | 'height' | 'original';

    history: GalleryInfo[];
    favorites: GalleryInfo[];

    homeGalleries: GalleryInfo[];
    homePage: number;
    homeHasMore: boolean;
    homeScrollY: number;

    filters: FilterState;

    setViewMode: (mode: 'webtoon' | 'book') => void;
    setDirection: (dir: 'ltr' | 'rtl') => void;
    setFitMode: (fit: 'width' | 'height' | 'original') => void;

    addToHistory: (gallery: GalleryInfo) => void;
    removeFromHistory: (id: string) => void;
    clearHistory: () => void;

    toggleFavorite: (gallery: GalleryInfo) => void;
    isFavorite: (id: string) => boolean;

    toggleFilter: (category: keyof FilterState, value: string) => void;
    clearFilters: () => void;

    setHomeState: (state: Partial<Pick<ViewerState, 'homeGalleries' | 'homePage' | 'homeHasMore' | 'homeScrollY'>>) => void;
    addHomeGalleries: (newGalleries: GalleryInfo[]) => void;
    resetHomeState: () => void;
}

export const useViewerStore = create<ViewerState>()(
    persist(
        (set, get) => ({
            viewMode: 'webtoon',
            direction: 'ltr',
            fitMode: 'width',
            history: [],
            favorites: [],

            homeGalleries: [],
            homePage: 1,
            homeHasMore: true,
            homeScrollY: 0,

            filters: {
                // [변경] 기본 Type 태그를 manga와 webtoon으로 지정
                types: ['manga', 'webtoon'],
                languages: [],
                artists: [],
                series: [],
                tags: [],
            },

            setViewMode: (mode) => set({ viewMode: mode }),
            setDirection: (dir) => set({ direction: dir }),
            setFitMode: (fit) => set({ fitMode: fit }),

            addToHistory: (gallery) => set((state) => {
                const simpleGallery = { ...gallery, files: gallery.files.slice(0, 1) };
                const filteredHistory = state.history.filter(h => h.id !== gallery.id);
                return { history: [simpleGallery, ...filteredHistory].slice(0, 50) };
            }),
            removeFromHistory: (id) => set((state) => ({
                history: state.history.filter((item) => item.id !== id)
            })),
            clearHistory: () => set({ history: [] }),

            toggleFavorite: (gallery) => set((state) => {
                const exists = state.favorites.some(f => f.id === gallery.id);
                if (exists) {
                    return { favorites: state.favorites.filter(f => f.id !== gallery.id) };
                } else {
                    const simpleGallery = { ...gallery, files: gallery.files.slice(0, 1) };
                    return { favorites: [simpleGallery, ...state.favorites] };
                }
            }),
            isFavorite: (id) => get().favorites.some(f => f.id === id),

            toggleFilter: (category, value) => set((state) => {
                const current = state.filters[category];
                const next = current.includes(value)
                    ? current.filter(item => item !== value)
                    : [...current, value];
                return { filters: { ...state.filters, [category]: next } };
            }),

            // [참고] 리셋 버튼 클릭 시에는 '전체 보기'를 위해 모든 필터를 비웁니다.
            // 만약 리셋 시에도 manga/webtoon으로 돌아가길 원하시면 여기도 수정해야 합니다.
            clearFilters: () => set({
                filters: { types: [], languages: [], artists: [], series: [], tags: [] }
            }),

            setHomeState: (newState) => set((state) => ({ ...state, ...newState })),

            addHomeGalleries: (newGalleries) => set((state) => {
                const optimizedNew = newGalleries.map(g => ({
                    ...g,
                    files: g.files.slice(0, 1)
                }));
                const combined = [...state.homeGalleries, ...optimizedNew];
                const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
                return { homeGalleries: unique };
            }),

            resetHomeState: () => set({
                homeGalleries: [],
                homePage: 1,
                homeHasMore: true,
                homeScrollY: 0
            }),
        }),
        {
            name: 'viewer-storage',
            version: 3, // 버전 업 (초기값 변경 반영을 위해 필요할 수 있음)
            migrate: (persistedState: any, version) => {
                // 버전 3 미만일 경우 types 초기값 강제 설정
                if (version < 3) {
                    return {
                        ...persistedState,
                        filters: {
                            ...persistedState.filters,
                            types: ['manga', 'webtoon']
                        }
                    };
                }
                return persistedState;
            },
            partialize: (state) => ({
                viewMode: state.viewMode,
                direction: state.direction,
                fitMode: state.fitMode,
                history: state.history,
                favorites: state.favorites,
                filters: state.filters,
                homeGalleries: state.homeGalleries,
                homePage: state.homePage,
                homeHasMore: state.homeHasMore,
                homeScrollY: state.homeScrollY,
            }),
        }
    )
);