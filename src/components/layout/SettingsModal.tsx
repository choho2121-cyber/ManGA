"use client";

import { useViewerStore } from "@/store/useViewerStore";
import { X, Settings, Check, Plus, Tag, Ban } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { preferences, setPreference } = useViewerStore();
    const [mounted, setMounted] = useState(false);

    const [prefInput, setPrefInput] = useState("");
    const [exclInput, setExclInput] = useState("");

    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    const TYPES = ['manga', 'webtoon', 'doujinshi', 'gamecg', 'imageset'];
    const LANGUAGES = ['korean', 'japanese', 'english', 'chinese'];

    const addTag = (type: 'preferred' | 'excluded', value: string) => {
        const tag = value.trim().toLowerCase();
        if (!tag) return;

        // ✅ 안전한 접근: preferences.preferredTags가 undefined일 경우 빈 배열로 처리
        const currentPreferred = preferences.preferredTags || [];
        const currentExcluded = preferences.excludedTags || [];

        if (type === 'preferred') {
            if (!currentPreferred.includes(tag)) {
                setPreference('preferredTags', [...currentPreferred, tag]);
            }
            setPrefInput("");
        } else {
            if (!currentExcluded.includes(tag)) {
                setPreference('excludedTags', [...currentExcluded, tag]);
            }
            setExclInput("");
        }
    };

    const removeTag = (type: 'preferred' | 'excluded', tag: string) => {
        // ✅ 삭제 시에도 안전하게 접근
        if (type === 'preferred') {
            setPreference('preferredTags', (preferences.preferredTags || []).filter(t => t !== tag));
        } else {
            setPreference('excludedTags', (preferences.excludedTags || []).filter(t => t !== tag));
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose} className="absolute inset-0 bg-black/30"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative z-[70] w-full max-w-md max-h-[85vh] overflow-hidden rounded-3xl border border-white/20 bg-white/5 shadow-2xl shadow-black/50 backdrop-blur-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-4 shrink-0">
                            <div className="flex items-center gap-2 text-white">
                                <Settings className="h-5 w-5 text-indigo-400" />
                                <h2 className="text-lg font-bold">Preferences</h2>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-gray-400 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-8 overflow-y-auto scrollbar-hide">

                            {/* Default Type */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-gray-300">Default Type</label>
                                    {preferences.defaultType && (
                                        <button onClick={() => setPreference('defaultType', null)} className="text-xs text-red-400 hover:underline">Reset</button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {TYPES.map(type => {
                                        const isActive = preferences.defaultType === type;
                                        return (
                                            <button
                                                key={type}
                                                onClick={() => setPreference('defaultType', isActive ? null : type)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isActive ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20" : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"}`}
                                            >
                                                {type}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Preferred Language */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-gray-300">Preferred Language</label>
                                    {preferences.preferredLanguage && (
                                        <button onClick={() => setPreference('preferredLanguage', null)} className="text-xs text-red-400 hover:underline">Reset</button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {LANGUAGES.map(lang => {
                                        const isActive = preferences.preferredLanguage === lang;
                                        return (
                                            <button
                                                key={lang}
                                                onClick={() => setPreference('preferredLanguage', isActive ? null : lang)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isActive ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"}`}
                                            >
                                                {isActive && <Check className="h-3 w-3" />}
                                                {lang}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <hr className="border-white/10" />

                            {/* Preferred Tags */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-emerald-400">
                                    <Tag className="h-4 w-4" />
                                    <label className="text-sm font-medium">Preferred Tags</label>
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-emerald-500/50 transition-colors">
                                    <input
                                        type="text"
                                        placeholder="Add tag..."
                                        value={prefInput}
                                        onChange={(e) => setPrefInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addTag('preferred', prefInput)}
                                        className="bg-transparent w-full text-sm text-white outline-none placeholder-gray-500"
                                    />
                                    <button onClick={() => addTag('preferred', prefInput)} className="p-1 hover:bg-emerald-500/20 rounded-full text-gray-400 hover:text-emerald-400 transition-colors">
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {/* ✅ 안전한 렌더링: 배열이 없으면 빈 배열 매핑 */}
                                    {(preferences.preferredTags || []).map(tag => (
                                        <span key={tag} className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs animate-in fade-in zoom-in duration-200">
                                            {tag}
                                            <button onClick={() => removeTag('preferred', tag)} className="p-0.5 hover:bg-emerald-500/20 rounded-full"><X className="h-3 w-3" /></button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Excluded Tags */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-red-400">
                                    <Ban className="h-4 w-4" />
                                    <label className="text-sm font-medium">Excluded Tags</label>
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-red-500/50 transition-colors">
                                    <input
                                        type="text"
                                        placeholder="Block tag..."
                                        value={exclInput}
                                        onChange={(e) => setExclInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addTag('excluded', exclInput)}
                                        className="bg-transparent w-full text-sm text-white outline-none placeholder-gray-500"
                                    />
                                    <button onClick={() => addTag('excluded', exclInput)} className="p-1 hover:bg-red-500/20 rounded-full text-gray-400 hover:text-red-400 transition-colors">
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {/* ✅ 안전한 렌더링 */}
                                    {(preferences.excludedTags || []).map(tag => (
                                        <span key={tag} className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-in fade-in zoom-in duration-200">
                                            {tag}
                                            <button onClick={() => removeTag('excluded', tag)} className="p-0.5 hover:bg-red-500/20 rounded-full"><X className="h-3 w-3" /></button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}