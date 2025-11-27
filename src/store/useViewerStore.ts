import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GalleryInfo } from "@/types";

interface ViewerState {
    viewMode: 'webtoon' | 'book';
    direction: 'ltr' | 'rtl';
    fitMode: 'width' | 'height' | 'original';

    history: GalleryInfo[];
    favorites: GalleryInfo[];

    preferences: {
        defaultType: string | null;
        preferredLanguage: string | null;
        preferredTags: string[];
        excludedTags: string[];
    };

    setViewMode: (mode: 'webtoon' | 'book') => void;
    setDirection: (dir: 'ltr' | 'rtl') => void;
    setFitMode: (fit: 'width' | 'height' | 'original') => void;

    addToHistory: (gallery: GalleryInfo) => void;
    removeFromHistory: (id: string) => void;
    clearHistory: () => void;

    toggleFavorite: (gallery: GalleryInfo) => void;
    isFavorite: (id: string) => boolean;

    setPreference: <K extends keyof ViewerState['preferences']>(key: K, value: ViewerState['preferences'][K]) => void;
}

export const useViewerStore = create<ViewerState>()(
    persist(
        (set, get) => ({
            viewMode: 'webtoon',
            direction: 'ltr',
            fitMode: 'width',
            history: [],
            favorites: [],
            preferences: {
                defaultType: null,
                preferredLanguage: null,
                preferredTags: [],
                excludedTags: [],
            },

            setViewMode: (mode) => set({ viewMode: mode }),
            setDirection: (dir) => set({ direction: dir }),
            setFitMode: (fit) => set({ fitMode: fit }),

            addToHistory: (gallery) => set((state) => {
                const simpleGallery = { ...gallery, files: gallery.files.slice(0, 1) };
                const newHistory = [simpleGallery, ...state.history.filter(h => h.id !== gallery.id)].slice(0, 50);
                return { history: newHistory };
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

            setPreference: (key, value) => set((state) => ({
                preferences: { ...state.preferences, [key]: value }
            })),
        }),
        {
            name: 'viewer-storage',
            version: 1,
            migrate: (persistedState: any, version) => {
                if (version === 0) {
                    return {
                        ...persistedState,
                        preferences: {
                            ...persistedState.preferences,
                            preferredTags: [],
                            excludedTags: [],
                        },
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
                preferences: state.preferences,
            }),
        }
    )
);