"use client";

import Image from "next/image";
import Link from "next/link";
import { GalleryInfo } from "@/types";
import { motion } from "framer-motion";
import { ImageOff, Heart } from "lucide-react";
import { useViewerStore } from "@/store/useViewerStore";

interface GalleryCardProps {
    info: GalleryInfo;
    onTagClick?: (tag: string) => void;
}

export default function GalleryCard({ info, onTagClick }: GalleryCardProps) {
    const { toggleFavorite, isFavorite } = useViewerStore();
    const isFav = isFavorite(info.id);

    const coverImageName = info.files?.[0]?.name;
    const thumbnailUrl = coverImageName
        ? `/api/image/${info.id}/${encodeURIComponent(coverImageName)}`
        : null;

    return (
        <div className="relative group">
            <Link href={`/gallery/${info.id}`}>
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-900 shadow-lg transition-all hover:shadow-2xl cursor-pointer"
                >
                    {/* Thumbnail Image */}
                    <div className="relative h-full w-full bg-gray-800">
                        {thumbnailUrl ? (
                            <Image
                                src={thumbnailUrl}
                                alt={info.title}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-110"
                                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
                                unoptimized={true}
                            />
                        ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center text-gray-500">
                                <ImageOff className="h-10 w-10 mb-2 opacity-50" />
                                <span className="text-xs">No Image</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80" />
                    </div>

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 w-full p-3">
                        <h3 className="mb-2 line-clamp-2 text-sm font-bold text-white shadow-sm leading-snug">
                            {info.title}
                        </h3>
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5">
                            {info.tags.slice(0, 4).map((tag, i) => (
                                <span
                                    key={`${tag}-${i}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onTagClick?.(`tag:${tag}`);
                                    }}
                                    className="cursor-pointer rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-200 backdrop-blur-sm hover:bg-indigo-500 hover:text-white transition-colors"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Type Badge */}
                    <div className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[10px] font-bold uppercase text-white backdrop-blur-md shadow-sm border border-white/10">
                        {info.type}
                    </div>
                </motion.div>
            </Link>

            {/* Favorite Button (Overlay) */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(info);
                }}
                className="absolute top-2 right-2 z-20 rounded-full p-2 transition-all hover:scale-110 active:scale-95"
            >
                <Heart
                    className={`h-6 w-6 drop-shadow-md transition-colors ${isFav ? "fill-red-500 text-red-500" : "text-white hover:text-red-400"}`}
                />
            </button>
        </div>
    );
}