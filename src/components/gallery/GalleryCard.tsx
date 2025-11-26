"use client";

import Image from "next/image";
import Link from "next/link";
import { GalleryInfo } from "@/types";
import { motion } from "framer-motion";

interface GalleryCardProps {
    info: GalleryInfo;
}

export default function GalleryCard({ info }: GalleryCardProps) {
    return (
        <Link href={`/gallery/${info.id}`}>
            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-900 shadow-lg transition-all hover:shadow-2xl"
            >
                {/* Thumbnail Image */}
                <div className="relative h-full w-full">
                    <Image
                        src={`https://placehold.co/400x600/222/white?text=${info.title}`} // Placeholder for now
                        alt={info.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 transition-opacity group-hover:opacity-80" />
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 w-full p-4">
                    <h3 className="mb-1 truncate text-lg font-bold text-white shadow-sm">
                        {info.title}
                    </h3>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                        {info.tags.slice(0, 3).map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Type Badge */}
                <div className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-1 text-xs font-bold uppercase text-white backdrop-blur-md">
                    {info.type}
                </div>
            </motion.div>
        </Link>
    );
}
