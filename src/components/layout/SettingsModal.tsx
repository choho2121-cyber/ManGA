"use client";

import { useViewerStore } from "@/store/useViewerStore";
import { X, Settings, Check, Plus, Tag, Ban, FileDigit, Search, Database, Loader2, ShieldAlert, HeartOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Suggestion {
    tag: string;
    count: number;
    ns: string;
}

// [추가] 표시용 번역 맵
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

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { preferences, setPreference } = useViewerStore();
    const [mounted, setMounted] = useState(false);

    const [prefInput, setPrefInput] = useState("");
    const [exclInput, setExclInput] = useState("");

    const [activeField, setActiveField] = useState<'preferred' | 'excluded' | 'defaultSearch' | null>(null);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const fetchSuggestions = async () => {
            let query = "";
            if (activeField === 'preferred') query = prefInput;
            else if (activeField === 'excluded') query = exclInput;
            else if (activeField === 'defaultSearch') {
                query = preferences.defaultSearchQuery?.split(' ').pop() || "";
            }

            if (!query || query.length < 2) {
                setSuggestions([]);
                return;
            }

            setIsSearching(true);
            try {
                const res = await fetch(`/api/suggestions?query=${encodeURIComponent(query)}`);
                const data = await res.json();
                setSuggestions(data.slice(0, 10));
            } catch (e) {
                console.error(e);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timer);
    }, [prefInput, exclInput, preferences.defaultSearchQuery, activeField]);

    if (!mounted) return null;

    const TYPES = ['manga', 'webtoon', 'doujinshi', 'gamecg', 'imageset'];
    const LANGUAGES = ['korean', 'japanese', 'english', 'chinese'];

    const toggleSelection = (key: 'defaultType' | 'preferredLanguage', value: string) => {
        const current = Array.isArray(preferences[key]) ? preferences[key] : [];
        // @ts-ignore
        const next = current.includes(value)
            // @ts-ignore
            ? current.filter(item => item !== value)
            // @ts-ignore
            : [...current, value];
        setPreference(key, next);
    };

    const addTag = (type: 'preferred' | 'excluded', value: string) => {
        const tag = value.trim().toLowerCase();
        if (!tag) return;

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
        setSuggestions([]);
    };

    const removeTag = (type: 'preferred' | 'excluded', tag: string) => {
        if (type === 'preferred') {
            setPreference('preferredTags', (preferences.preferredTags || []).filter(t => t !== tag));
        } else {
            setPreference('excludedTags', (preferences.excludedTags || []).filter(t => t !== tag));
        }
    };

    const appendToSearchQuery = (tag: string) => {
        const current = preferences.defaultSearchQuery || "";
        const parts = current.split(' ');
        parts.pop();
        parts.push(tag);
        setPreference('defaultSearchQuery', parts.join(' ') + ' ');
        setSuggestions([]);
    };

    const renderSuggestions = (onSelect: (tag: string) => void) => {
        if (suggestions.length === 0) return null;
        return (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#1f1f1f] border border-white/10 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                {suggestions.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelect(item.tag)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white flex justify-between items-center"
                    >
                        <span>
                            {item.tag.includes(':') ? (
                                <>
                                    <span className="text-indigo-400">{item.tag.split(':')[0]}:</span>
                                    {item.tag.split(':')[1]}
                                </>
                            ) : item.tag}
                        </span>
                        <span className="text-xs text-gray-500">{item.count}</span>
                    </button>
                ))}
            </div>
        );
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
                        className="relative z-[70] w-full max-w-md max-h-[85vh] overflow-hidden rounded-3xl border border-white/20 bg-[#1a1a1a] shadow-2xl shadow-black/50 backdrop-blur-2xl flex flex-col"
                    >
                        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-4 shrink-0">
                            <div className="flex items-center gap-2 text-white">
                                <Settings className="h-5 w-5 text-indigo-400" />
                                <h2 className="text-lg font-bold">설정</h2>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-gray-400 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-8 overflow-y-auto scrollbar-hide text-white">

                            {/* Content Filters (BL/Gore) */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">컨텐츠 필터</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setPreference('excludeBL', !preferences.excludeBL)}
                                        className={`flex flex-col gap-2 p-4 rounded-xl border transition-all ${preferences.excludeBL ? 'bg-red-500/10 border-red-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className={`text-sm font-bold ${preferences.excludeBL ? 'text-red-400' : 'text-gray-400'}`}>BL 필터</span>
                                            <HeartOff className={`h-4 w-4 ${preferences.excludeBL ? 'text-red-400' : 'text-gray-500'}`} />
                                        </div>
                                        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors self-start ${preferences.excludeBL ? 'bg-red-500' : 'bg-white/20'}`}>
                                            <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${preferences.excludeBL ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setPreference('excludeGore', !preferences.excludeGore)}
                                        className={`flex flex-col gap-2 p-4 rounded-xl border transition-all ${preferences.excludeGore ? 'bg-orange-500/10 border-orange-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className={`text-sm font-bold ${preferences.excludeGore ? 'text-orange-400' : 'text-gray-400'}`}>고어물 필터</span>
                                            <ShieldAlert className={`h-4 w-4 ${preferences.excludeGore ? 'text-orange-400' : 'text-gray-500'}`} />
                                        </div>
                                        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors self-start ${preferences.excludeGore ? 'bg-orange-500' : 'bg-white/20'}`}>
                                            <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${preferences.excludeGore ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <hr className="border-white/10" />

                            {/* General Settings */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">일반</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <FileDigit className="h-4 w-4" />
                                            <label className="text-sm font-medium">Load Limit</label>
                                        </div>
                                        <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded">{preferences.galleryLoadLimit}</span>
                                    </div>
                                    <input
                                        type="range" min="10" max="100" step="5"
                                        value={preferences.galleryLoadLimit}
                                        onChange={(e) => setPreference('galleryLoadLimit', parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>

                                <div className="space-y-2 relative">
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <Search className="h-4 w-4" />
                                        <label className="text-sm font-medium">Default Search Query</label>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={preferences.defaultSearchQuery}
                                            onChange={(e) => setPreference('defaultSearchQuery', e.target.value)}
                                            onFocus={() => setActiveField('defaultSearch')}
                                            placeholder="e.g. language:korean"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500/50 outline-none transition-colors"
                                        />
                                        {activeField === 'defaultSearch' && isSearching && (
                                            <div className="absolute right-3 top-2.5"><Loader2 className="h-4 w-4 animate-spin text-gray-500" /></div>
                                        )}
                                    </div>
                                    {activeField === 'defaultSearch' && renderSuggestions(appendToSearchQuery)}
                                </div>
                            </div>

                            <hr className="border-white/10" />

                            {/* Filters */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">필터</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-gray-300">기본 타입</label>
                                        {(preferences.defaultType?.length > 0) && (
                                            <button onClick={() => setPreference('defaultType', [])} className="text-xs text-red-400 hover:underline">Reset</button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {TYPES.map(type => {
                                            const isActive = preferences.defaultType?.includes(type);
                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => toggleSelection('defaultType', type)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isActive ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20" : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"}`}
                                                >
                                                    {/* [수정] 번역된 라벨 표시 */}
                                                    {TYPE_LABELS[type] || type}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-gray-300">기본 언어</label>
                                        {(preferences.preferredLanguage?.length > 0) && (
                                            <button onClick={() => setPreference('preferredLanguage', [])} className="text-xs text-red-400 hover:underline">Reset</button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {LANGUAGES.map(lang => {
                                            const isActive = preferences.preferredLanguage?.includes(lang);
                                            return (
                                                <button
                                                    key={lang}
                                                    onClick={() => toggleSelection('preferredLanguage', lang)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isActive ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"}`}
                                                >
                                                    {isActive && <Check className="h-3 w-3" />}
                                                    {/* [수정] 번역된 라벨 표시 */}
                                                    {LANGUAGE_LABELS[lang] || lang}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <hr className="border-white/10" />

                            {/* Tags (생략: 기존 동일) */}
                            <div className="space-y-6">
                                <div className="space-y-3 relative">
                                    <div className="flex items-center gap-2 text-emerald-400">
                                        <Tag className="h-4 w-4" />
                                        <label className="text-sm font-medium">Preferred Tags</label>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-emerald-500/50 transition-colors relative">
                                        <input
                                            type="text"
                                            placeholder="Add tag..."
                                            value={prefInput}
                                            onChange={(e) => setPrefInput(e.target.value)}
                                            onFocus={() => setActiveField('preferred')}
                                            onKeyDown={(e) => e.key === 'Enter' && addTag('preferred', prefInput)}
                                            className="bg-transparent w-full text-sm text-white outline-none placeholder-gray-500"
                                        />
                                        {activeField === 'preferred' && isSearching ? <Loader2 className="h-4 w-4 animate-spin text-gray-500" /> :
                                            <button onClick={() => addTag('preferred', prefInput)} className="p-1 hover:bg-emerald-500/20 rounded-full text-gray-400 hover:text-emerald-400">
                                                <Plus className="h-4 w-4" />
                                            </button>}
                                    </div>
                                    {activeField === 'preferred' && renderSuggestions((tag) => addTag('preferred', tag))}

                                    <div className="flex flex-wrap gap-2">
                                        {(preferences.preferredTags || []).map(tag => (
                                            <span key={tag} className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                                                {tag}
                                                <button onClick={() => removeTag('preferred', tag)} className="p-0.5 hover:bg-emerald-500/20 rounded-full"><X className="h-3 w-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3 relative">
                                    <div className="flex items-center gap-2 text-red-400">
                                        <Ban className="h-4 w-4" />
                                        <label className="text-sm font-medium">Excluded Tags</label>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-red-500/50 transition-colors relative">
                                        <input
                                            type="text"
                                            placeholder="Block tag..."
                                            value={exclInput}
                                            onChange={(e) => setExclInput(e.target.value)}
                                            onFocus={() => setActiveField('excluded')}
                                            onKeyDown={(e) => e.key === 'Enter' && addTag('excluded', exclInput)}
                                            className="bg-transparent w-full text-sm text-white outline-none placeholder-gray-500"
                                        />
                                        {activeField === 'excluded' && isSearching ? <Loader2 className="h-4 w-4 animate-spin text-gray-500" /> :
                                            <button onClick={() => addTag('excluded', exclInput)} className="p-1 hover:bg-red-500/20 rounded-full text-gray-400 hover:text-red-400">
                                                <Plus className="h-4 w-4" />
                                            </button>}
                                    </div>
                                    {activeField === 'excluded' && renderSuggestions((tag) => addTag('excluded', tag))}

                                    <div className="flex flex-wrap gap-2">
                                        {(preferences.excludedTags || []).map(tag => (
                                            <span key={tag} className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                                {tag}
                                                <button onClick={() => removeTag('excluded', tag)} className="p-0.5 hover:bg-red-500/20 rounded-full"><X className="h-3 w-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}