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

interface UserPreferences {
    defaultType: string[];
    preferredLanguage: string[];
    preferredTags: string[];
    excludedTags: string[];
    galleryLoadLimit: number;
    defaultSearchQuery: string;
    maxCacheSize: number;
    excludeBL: boolean;   // [추가] BL 제외 여부
    excludeGore: boolean; // [추가] 고어 제외 여부
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
    preferences: UserPreferences;

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

    setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;

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
                types: ['manga', 'webtoon'],
                languages: [],
                artists: [],
                series: [],
                tags: [],
            },

            preferences: {
                defaultType: [],
                preferredLanguage: [],
                preferredTags: [],
                excludedTags: [],
                galleryLoadLimit: 25,
                defaultSearchQuery: "",
                maxCacheSize: 500,
                excludeBL: false,   // [추가] 기본값 false
                excludeGore: false, // [추가] 기본값 false
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

            clearFilters: () => set({
                filters: { types: [], languages: [], artists: [], series: [], tags: [] }
            }),

            setPreference: (key, value) => set((state) => ({
                preferences: { ...state.preferences, [key]: value }
            })),

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
            version: 6, // [변경] 버전 업 (필드 추가)
            migrate: (persistedState: any, version) => {
                let newState = persistedState;
                if (version < 5) {
                    // v5 마이그레이션 (단일값 -> 배열)
                    const oldType = persistedState.preferences?.defaultType;
                    const oldLang = persistedState.preferences?.preferredLanguage;
                    newState = {
                        ...persistedState,
                        preferences: {
                            ...persistedState.preferences,
                            defaultType: oldType ? [oldType] : [],
                            preferredLanguage: oldLang ? [oldLang] : [],
                        }
                    };
                }
                if (version < 6) {
                    // v6 마이그레이션 (BL/Gore 필터 추가)
                    newState = {
                        ...newState,
                        preferences: {
                            ...newState.preferences,
                            excludeBL: false,
                            excludeGore: false,
                        }
                    };
                }
                return newState;
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
                preferences: state.preferences,
            }),
        }
    )
);