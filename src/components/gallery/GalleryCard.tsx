"use client";

import Image from "next/image";
import Link from "next/link";
import { GalleryInfo } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { ImageOff, Heart, User, Tag as TagIcon, Globe, BookOpen, Users, Smile } from "lucide-react";
import { useViewerStore } from "@/store/useViewerStore";
import { useRef, useState } from "react";

interface GalleryCardProps {
    info: GalleryInfo;
    onTagClick?: (tag: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
    manga: "망가",
    webtoon: "웹툰",
    doujinshi: "동인지",
    gamecg: "게임 CG",
    imageset: "이미지 모음",
    artistcg: "작가 CG",
    anime: "애니메이션",
};

const LANGUAGE_LABELS: Record<string, string> = {
    korean: "한국어",
    japanese: "일본어",
    english: "영어",
    chinese: "중국어",
};

export default function GalleryCard({ info, onTagClick }: GalleryCardProps) {
    const { toggleFavorite, isFavorite } = useViewerStore();
    const isFav = isFavorite(info.id);
    const cardRef = useRef<HTMLDivElement>(null);
    const [popoverSide, setPopoverSide] = useState<'left' | 'right'>('right');

    const coverImageName = info.files?.[0]?.name;
    const thumbnailUrl = coverImageName
        ? `/api/image/${info.id}/${encodeURIComponent(coverImageName)}`
        : null;

    const displayType = info.type;
    const typeLabel = TYPE_LABELS[displayType] || displayType;
    const languageLabel = info.language ? (LANGUAGE_LABELS[info.language] || info.language) : "";

    const handleMouseEnter = () => {
        if (cardRef.current) {
            const rect = cardRef.current.getBoundingClientRect();
            const screenWidth = window.innerWidth;
            if (rect.left + rect.width / 2 > screenWidth / 2) {
                setPopoverSide('left');
            } else {
                setPopoverSide('right');
            }
        }
    };

    // 공백을 언더바로 변환하는 함수
    const normalizeTag = (tag: string) => tag.replace(/\s+/g, '_');

    return (
        <div
            ref={cardRef}
            onMouseEnter={handleMouseEnter}
            className="relative group h-full hover:z-50"
        >
            {/* === 기본 카드 (Base Card) === */}
            <Link href={`/gallery/${info.id}`} className="block h-full">
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-gray-900 shadow-xl transition-all duration-300 group-hover:shadow-2xl group-hover:ring-2 group-hover:ring-indigo-500/50 cursor-pointer"
                >
                    {/* Thumbnail Image */}
                    <div className="relative h-full w-full bg-gray-800">
                        {thumbnailUrl ? (
                            <Image
                                src={thumbnailUrl}
                                alt={info.title}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                unoptimized={true}
                            />
                        ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center text-gray-500">
                                <ImageOff className="h-12 w-12 mb-3 opacity-30" />
                                <span className="text-sm font-medium opacity-50">No Image</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                    </div>

                    {/* Simple Content Overlay */}
                    <div className="absolute bottom-0 left-0 w-full p-4">
                        <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 mb-2 drop-shadow-sm">
                            {info.title}
                        </h3>
                        <div className="flex flex-wrap gap-1">
                            {info.tags.slice(0, 3).map((tag, i) => {
                                const cleanTag = tag.replace(/^(female|male):/, '');
                                const isFemale = tag.startsWith('female:');
                                const isMale = tag.startsWith('male:');

                                return (
                                    <span
                                        key={`${tag}-${i}`}
                                        // [수정] 성별 접두사를 명시적으로 붙여서 전송
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const prefix = isFemale ? 'female:' : isMale ? 'male:' : '';
                                            onTagClick?.(`${prefix}${normalizeTag(cleanTag)}`);
                                        }}
                                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium backdrop-blur-md cursor-pointer transition-colors border
                                            ${isFemale
                                                ? 'bg-pink-500/20 text-pink-200 border-pink-500/30 hover:bg-pink-500/40'
                                                : isMale
                                                    ? 'bg-blue-500/20 text-blue-200 border-blue-500/30 hover:bg-blue-500/40'
                                                    : 'bg-white/10 text-gray-300 border-white/10 hover:bg-white/20'
                                            }
                                        `}
                                    >
                                        {cleanTag}
                                    </span>
                                );
                            })}
                            {info.tags.length > 3 && (
                                <span className="text-[9px] text-gray-400 self-center">+{info.tags.length - 3}</span>
                            )}
                        </div>
                    </div>

                    {/* Type Badge */}
                    <div className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur-md shadow-sm border border-white/10 ${displayType === 'webtoon' ? 'bg-indigo-600/90' :
                        displayType === 'gamecg' ? 'bg-green-600/90' :
                            displayType === 'doujinshi' ? 'bg-red-600/90' :
                                displayType === 'manga' ? 'bg-orange-600/90' :
                                    'bg-black/70'
                        }`}>
                        {typeLabel}
                    </div>
                </motion.div>
            </Link>

            {/* Favorite Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(info);
                }}
                className="absolute top-2 right-2 z-30 rounded-full p-2 transition-all hover:bg-black/20 hover:scale-110 active:scale-95"
            >
                <Heart
                    className={`h-5 w-5 drop-shadow-lg transition-colors ${isFav ? "fill-red-500 text-red-500" : "text-white hover:text-red-400"}`}
                />
            </button>

            {/* === 정보 팝오버 (Detail Popover) === */}
            <div
                className={`absolute top-0 h-full w-80 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-5 flex flex-col gap-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-40 pointer-events-none group-hover:pointer-events-auto overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent ${popoverSide === 'right' ? 'left-[calc(100%+0.75rem)]' : 'right-[calc(100%+0.75rem)]'
                    }`}
            >
                {/* Full Title */}
                <h3 className="text-base font-bold text-white leading-snug">
                    {info.title}
                </h3>

                {/* Meta Info */}
                <div className="flex items-center gap-3 text-xs text-gray-400">
                    {info.language && (
                        <div className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5" />
                            <span>{languageLabel}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span className="uppercase">{typeLabel}</span>
                    </div>
                </div>

                <hr className="border-white/10" />

                {/* Artists */}
                {info.artists && info.artists.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo-300">
                            <User className="w-4 h-4" />
                            <span>Artists</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {info.artists.map((artist, index) => (
                                <span
                                    key={`${artist}-${index}`}
                                    onClick={(e) => { e.stopPropagation(); onTagClick?.(`artist:${normalizeTag(artist)}`); }}
                                    className="text-xs px-2 py-1 rounded-md bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/40 hover:text-white cursor-pointer transition-colors"
                                >
                                    {artist}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Groups */}
                {info.groups && info.groups.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-sky-300">
                            <Users className="w-4 h-4" />
                            <span>Groups</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {info.groups.map((group, index) => (
                                <span
                                    key={`${group}-${index}`}
                                    onClick={(e) => { e.stopPropagation(); onTagClick?.(`group:${normalizeTag(group)}`); }}
                                    className="text-xs px-2 py-1 rounded-md bg-sky-500/20 text-sky-200 hover:bg-sky-500/40 hover:text-white cursor-pointer transition-colors"
                                >
                                    {group}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Series */}
                {info.series && info.series.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-yellow-300">
                            <BookOpen className="w-4 h-4" />
                            <span>Series</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {info.series.map((series, index) => (
                                <span
                                    key={`${series}-${index}`}
                                    onClick={(e) => { e.stopPropagation(); onTagClick?.(`series:${normalizeTag(series)}`); }}
                                    className="text-xs px-2 py-1 rounded-md bg-yellow-500/20 text-yellow-200 hover:bg-yellow-500/40 hover:text-white cursor-pointer transition-colors"
                                >
                                    {series}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Characters */}
                {info.characters && info.characters.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-pink-300">
                            <Smile className="w-4 h-4" />
                            <span>Characters</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {info.characters.map((char, index) => (
                                <span
                                    key={`${char}-${index}`}
                                    onClick={(e) => { e.stopPropagation(); onTagClick?.(`character:${normalizeTag(char)}`); }}
                                    className="text-xs px-2 py-1 rounded-md bg-pink-500/20 text-pink-200 hover:bg-pink-500/40 hover:text-white cursor-pointer transition-colors"
                                >
                                    {char}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tags (Popover) */}
                {info.tags && info.tags.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
                            <TagIcon className="w-4 h-4" />
                            <span>Tags</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {info.tags.map((tag, index) => {
                                const isSwimsuit = tag.includes('swimsuit');
                                const cleanTag = tag.replace(/^(female|male):/, '');
                                const isFemale = tag.startsWith('female:') || isSwimsuit; // swimsuit이면 isFemale을 강제로 true
                                const isMale = tag.startsWith('male:');

                                return (
                                    <span
                                        key={`${tag}-${index}`}
                                        onClick={(e) => {
                                            // ⬇️ 이 부분을 추가합니다.
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const prefix = isFemale ? 'female:' : isMale ? 'male:' : '';
                                            onTagClick?.(`${prefix}${normalizeTag(cleanTag)}`);
                                        }}
                                        className={`text-xs px-2 py-0.5 rounded-md border cursor-pointer transition-colors
                                            ${isFemale ? 'bg-pink-500/10 text-pink-300 border-pink-500/20 hover:bg-pink-500/30' :
                                                isMale ? 'bg-blue-500/10 text-blue-300 border-blue-500/20 hover:bg-blue-500/30' :
                                                    'bg-white/10 text-gray-300 border-white/5 hover:bg-emerald-600/80 hover:border-emerald-500 hover:text-white'}
                                        `}
                                    >
                                        {cleanTag}
                                    </span>
                                );

                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}