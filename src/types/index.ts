export interface GalleryInfo {
  id: string;
  title: string;
  type: string;
  tags: string[];
  artists?: string[];
  groups?: string[];
  series?: string[];
  characters?: string[];
  language?: string;
  files: {
    name: string;
    width: number;
    height: number;
    hash: string;
    haswebp: number;
  }[];
}