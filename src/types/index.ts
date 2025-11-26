export interface GalleryInfo {
  id: string;
  title: string;
  tags: string[];
  type: 'manga' | 'webtoon'; // Default view mode
  files: { name: string; width: number; height: number; }[];
}
