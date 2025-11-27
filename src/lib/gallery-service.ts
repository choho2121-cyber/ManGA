import fs from 'fs';
import path from 'path';
import https from 'https';
import { GalleryInfo } from "@/types";

// --- 설정 및 상수 ---
const DOMAIN = "ltn.gold-usergeneratedcontent.net";
const CACHE_ROOT = path.join(process.cwd(), '.cache');
const CACHE_DIRS = ['galleries', 'nozomi'].map(dir => path.join(CACHE_ROOT, dir));

CACHE_DIRS.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const agent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 10000,
    maxSockets: 50
});

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://hitomi.la/'
};

// --- GG Logic ---
interface GG { m: (g: number) => number; b: string; }
let ggInstance: GG | null = null;
let lastGGRequest = 0;

async function getGG(): Promise<GG> {
    const now = Date.now();
    if (ggInstance && now - lastGGRequest < 60 * 1000) return ggInstance;
    try {
        const res = await fetch(`https://${DOMAIN}/gg.js`, { headers: HEADERS, agent } as any);
        const text = await res.text();
        const mDefault = parseInt(/var o = (\d)/.exec(text)?.[1] || "0");
        const oValue = parseInt(/o = (\d); break;/.exec(text)?.[1] || "0");
        const bValue = /b:\s*'(.+?)'/.exec(text)?.[1] || "";
        const caseMap = new Map<number, number>();
        for (const match of text.matchAll(/case (\d+):/g)) {
            caseMap.set(parseInt(match[1]), oValue);
        }
        ggInstance = { m: (g: number) => caseMap.get(g) ?? mDefault, b: bValue };
        lastGGRequest = now;
        return ggInstance;
    } catch (e) { return { m: () => 0, b: '1' }; }
}

function s(hash: string): number {
    const match = /(..)(.)$/.exec(hash);
    return match ? parseInt(match[2] + match[1], 16) : 0;
}

async function getSubdomain(hash: string): Promise<string> {
    const gg = await getGG();
    return 'a' + (gg.m(s(hash)) + 1);
}

// --- Utils ---
async function readJsonFile<T>(filePath: string): Promise<T | null> {
    try {
        const data = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch { return null; }
}

async function writeJsonFile(filePath: string, data: any): Promise<void> {
    try {
        await fs.promises.writeFile(filePath, JSON.stringify(data));
    } catch { }
}

async function fetchWithTimeout(url: string) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    try {
        const res = await fetch(url, { headers: HEADERS, agent, signal: controller.signal } as any);
        return res;
    } finally {
        clearTimeout(id);
    }
}

// --- Nozomi ---

function encodeTag(tag: string): string {
    return tag.split('').map(c => {
        if (c === ' ') return '_';
        if (c === '/') return 'slash';
        if (c === '.') return 'dot';
        return c;
    }).join('');
}

function getNozomiPath(category: string, value: string): string {
    let area = category;
    let tagVal = value;

    if (value.includes(':')) {
        const parts = value.split(':');
        if (parts[0] === 'male' || parts[0] === 'female') {
            area = 'tag';
            tagVal = value;
        } else {
            area = parts[0];
            tagVal = parts.slice(1).join(':');
        }
    }

    if ((area === 'type' || area === 'types') && tagVal === 'webtoon') {
        area = 'tag';
        tagVal = 'webtoon';
    }

    const encodedValue = encodeTag(tagVal);

    if (area === 'language' || area === 'languages') return `index-${encodedValue}`;
    if (area === 'type' || area === 'types') return `type/${encodedValue}-all`;

    if (['artist', 'series', 'character', 'group', 'artists', 'groups', 'characters'].includes(area)) {
        if (area.endsWith('s')) area = area.slice(0, -1);
        return `${area}/${encodedValue}-all`;
    }

    return `tag/${encodedValue}-all`;
}

async function fetchNozomiIds(pathName: string): Promise<number[]> {
    const safeFileName = pathName.replace(/[\/:]/g, '-') + '.nozomi';
    const localPath = path.join(CACHE_ROOT, 'nozomi', safeFileName);

    try {
        let buffer: Buffer;

        try {
            buffer = await fs.promises.readFile(localPath);
            if (buffer.length === 0) {
                await fs.promises.unlink(localPath);
                throw new Error("Empty cache");
            }
        } catch (e) {
            let url = `https://${DOMAIN}/${pathName}.nozomi`;
            if (pathName !== 'index-all' && (pathName.includes('/') || pathName.startsWith('index-'))) {
                url = `https://${DOMAIN}/n/${pathName}.nozomi`;
            }

            console.log(`Fetching Nozomi: ${url}`);
            const res = await fetch(url, { headers: HEADERS, agent } as any);

            if (!res.ok) {
                if (res.status === 404) return [];
                throw new Error(`Failed to fetch ${url}: ${res.status}`);
            }

            const arrayBuffer = await res.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);

            if (buffer.length > 0) {
                await fs.promises.writeFile(localPath, buffer);
            } else {
                return [];
            }
        }

        const ids: number[] = [];
        for (let i = 0; i < buffer.length; i += 4) {
            ids.push(buffer.readInt32BE(i));
        }
        return ids;
    } catch (e) {
        console.error(`Error processing nozomi ${pathName}:`, e);
        return [];
    }
}

export interface FilterParams {
    [key: string]: string[];
}

export async function getFilteredGalleryIds(
    filters: FilterParams,
    excludedFilters: FilterParams = {}
): Promise<number[]> {
    let currentIdSet: Set<number> | null = null;

    // 1. Type (OR)
    if (filters['type'] && filters['type'].length > 0) {
        const typeUnionSet = new Set<number>();
        const promises = filters['type'].map(val => fetchNozomiIds(getNozomiPath('type', val)));
        const results = await Promise.all(promises);
        results.forEach(ids => ids.forEach(id => typeUnionSet.add(id)));
        currentIdSet = typeUnionSet;
    }

    // 2. Language (OR)
    if (filters['language'] && filters['language'].length > 0) {
        const langUnionSet = new Set<number>();
        const promises = filters['language'].map(val => fetchNozomiIds(getNozomiPath('language', val)));
        const results = await Promise.all(promises);
        results.forEach(ids => ids.forEach(id => langUnionSet.add(id)));

        if (currentIdSet === null) {
            currentIdSet = langUnionSet;
        } else {
            const previousIds = Array.from(currentIdSet);
            currentIdSet = new Set(previousIds.filter(x => langUnionSet.has(x)));
        }
    }

    if (currentIdSet !== null && currentIdSet.size === 0) return [];

    // 3. Tags (AND)
    for (const [key, values] of Object.entries(filters)) {
        if (key === 'type' || key === 'language') continue;
        if (!values || values.length === 0) continue;

        for (const val of values) {
            const ids = await fetchNozomiIds(getNozomiPath(key, val));
            const idSet = new Set(ids);

            if (currentIdSet === null) {
                currentIdSet = idSet;
            } else {
                const previousIds = Array.from(currentIdSet);
                currentIdSet = new Set(previousIds.filter(x => idSet.has(x)));
            }
            if (currentIdSet.size === 0) return [];
        }
    }

    if (currentIdSet === null) {
        const ids = await fetchNozomiIds('index-all');
        currentIdSet = new Set(ids);
    }

    // 4. Excluded (Subtract)
    const exCategories = Object.keys(excludedFilters);
    if (exCategories.length > 0) {
        const excludedIds = new Set<number>();
        for (const cat of exCategories) {
            const values = excludedFilters[cat];
            if (!values || values.length === 0) continue;

            const promises = values.map(val => fetchNozomiIds(getNozomiPath(cat, val)));
            const results = await Promise.all(promises);
            results.forEach(ids => ids.forEach(id => excludedIds.add(id)));
        }

        if (excludedIds.size > 0) {
            const previousIds = Array.from(currentIdSet);
            currentIdSet = new Set(previousIds.filter(x => !excludedIds.has(x)));
        }
    }

    return Array.from(currentIdSet).sort((a, b) => b - a);
}

// --- Detail & Main ---
const memoryGalleryCache = new Map<string, GalleryInfo>();

function refineGalleryType(info: GalleryInfo): void {
    if (!info.tags) return;

    if (info.tags.includes('gamecg')) info.type = 'gamecg';
    else if (info.tags.includes('artistcg')) info.type = 'artistcg';
    else if (info.tags.includes('imageset')) info.type = 'imageset';
    else if (info.tags.includes('anime')) info.type = 'anime';
    else if (info.tags.includes('webtoon')) {
        if (info.type === 'manga' || info.type === 'doujinshi') {
            info.type = 'webtoon';
        }
    }
}

export async function getGalleryDetail(id: string): Promise<GalleryInfo | null> {
    if (memoryGalleryCache.has(id)) return memoryGalleryCache.get(id)!;
    const localPath = path.join(CACHE_ROOT, 'galleries', `${id}.json`);

    const cached = await readJsonFile<GalleryInfo>(localPath);
    if (cached) {
        refineGalleryType(cached);
        memoryGalleryCache.set(id, cached);
        return cached;
    }

    try {
        const res = await fetchWithTimeout(`https://${DOMAIN}/galleries/${id}.js`);
        if (!res.ok) return null;
        const text = await res.text();
        const jsonStr = text.replace("var galleryinfo = ", "");
        const data = JSON.parse(jsonStr);

        const galleryInfo: GalleryInfo = {
            id: String(data.id),
            title: data.title,
            type: data.type,
            language: data.language,
            // [수정] 태그 파싱 강화: 1, '1', true 등 모든 Truthy 값 체크
            tags: data.tags?.map((t: any) => {
                let prefix = '';
                // female, male 속성이 존재하고 Truthy(1, '1', true)이면 접두사 추가
                if (t.female) prefix = 'female:';
                else if (t.male) prefix = 'male:';
                return `${prefix}${t.tag}`;
            }) || [],
            artists: data.artists?.map((a: any) => a.artist) || [],
            groups: data.groups?.map((g: any) => g.group) || [],
            series: data.parodys?.map((p: any) => p.parody) || [],
            characters: data.characters?.map((c: any) => c.character) || [],
            files: data.files.map((f: any) => ({
                name: f.name,
                width: f.width,
                height: f.height,
                hash: f.hash,
                haswebp: f.haswebp
            })),
        };

        refineGalleryType(galleryInfo);

        memoryGalleryCache.set(id, galleryInfo);
        writeJsonFile(localPath, galleryInfo);
        return galleryInfo;
    } catch { return null; }
}

export async function getGalleries(
    page = 1,
    limit = 24,
    filters: FilterParams = {},
    excludedFilters: FilterParams = {}
): Promise<{ galleries: GalleryInfo[], total: number }> {
    const allIds = await getFilteredGalleryIds(filters, excludedFilters);
    const total = allIds.length;

    const start = (page - 1) * limit;
    const end = start + limit;

    if (start >= allIds.length) {
        return { galleries: [], total };
    }

    const pageIds = allIds.slice(start, end);
    const results = await Promise.all(pageIds.map(id => getGalleryDetail(String(id))));
    const galleries = results.filter((g): g is GalleryInfo => g !== null);

    return { galleries, total };
}

export async function getImageUrl(hash: string): Promise<string> {
    const gg = await getGG();
    const subdomain = await getSubdomain(hash);
    const path = `${gg.b}${s(hash)}/${hash}`;
    return `https://${subdomain}.gold-usergeneratedcontent.net/${path}.avif`;
}