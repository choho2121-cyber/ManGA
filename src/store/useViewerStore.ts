import { create } from 'zustand';

interface ViewerState {
    viewMode: 'webtoon' | 'book';
    direction: 'ltr' | 'rtl';
    fitMode: 'width' | 'height' | 'original';

    setViewMode: (mode: 'webtoon' | 'book') => void;
    setDirection: (dir: 'ltr' | 'rtl') => void;
    setFitMode: (fit: 'width' | 'height' | 'original') => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
    viewMode: 'webtoon',
    direction: 'ltr',
    fitMode: 'width',

    setViewMode: (mode) => set({ viewMode: mode }),
    setDirection: (dir) => set({ direction: dir }),
    setFitMode: (fit) => set({ fitMode: fit }),
}));
