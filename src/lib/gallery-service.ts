import fs from 'fs';
import path from 'path';
import https from 'https';
import { GalleryInfo } from "@/types";

const DOMAIN = "ltn.gold-usergeneratedcontent.net";
const CACHE_ROOT = path.join(process.cwd(), '.cache');
const GALLERY_CACHE_DIR = path.join(CACHE_ROOT, 'galleries');
const NOZOMI_CACHE_DIR = path.join(CACHE_ROOT, 'nozomi');

[GALLERY_CACHE_DIR, NOZOMI_CACHE_DIR].forEach(dir => {
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

interface GG { m: (g: number) => number; b: string; }
let ggInstance: GG | null = null;
let lastGGRequest = 0;

const memoryGalleryCache = new Map<string, GalleryInfo>();
const memoryIdsCache = new Map<string, number[]>();

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

function getNozomiPath(keyword: string): string {
    if (!keyword || keyword === 'index') return 'index-all';
    const parts = keyword.split(':');
    let area = parts[0];
    let tag = parts[1] || '';
    tag = tag.replace(/\s+/g, '_');

    if (area === 'language' || area === 'lang') return `index-${tag}`;
    if (area === 'type') return `type/${tag}-all`;
    if (parts.length === 1) return `tag/${area}-all`;

    return `${area}/${tag}-all`;
}

async function fetchWithTimeout(url: string) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    try {
        const res = await fetch(url, {
            headers: HEADERS,
            // @ts-ignore
            agent: agent,
            signal: controller.signal
        });
        return res;
    } finally {
        clearTimeout(id);
    }
}

async function fetchIds(keyword: string): Promise<number[]> {
    if (memoryIdsCache.has(keyword)) return memoryIdsCache.get(keyword)!;

    const nozomiName = getNozomiPath(keyword);
    const cacheFileName = nozomiName.replace(/\//g, '-') + '.nozomi';
    const localPath = path.join(NOZOMI_CACHE_DIR, cacheFileName);

    try {
        let buffer: ArrayBuffer;

        try {
            const fileBuffer = await fs.promises.readFile(localPath);
            buffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
        } catch (e) {
            const url = `https://${DOMAIN}/${nozomiName}.nozomi`;
            console.log(`Fetching IDs from: ${url}`);

            const res = await fetch(url, { headers: HEADERS, agent } as any);
            if (!res.ok) {
                if (res.status === 404) return [];
                throw new Error(`Failed to fetch ${url}`);
            }
            buffer = await res.arrayBuffer();
            fs.promises.writeFile(localPath, Buffer.from(buffer)).catch(() => { });
        }

        const view = new DataView(buffer);
        const ids: number[] = [];
        for (let i = 0; i < view.byteLength; i += 4) {
            ids.push(view.getInt32(i, false));
        }

        ids.sort((a, b) => b - a);
        memoryIdsCache.set(keyword, ids);
        return ids;
    } catch (e) {
        console.error(`Error fetching IDs for ${keyword}:`, e);
        return [];
    }
}
export async function getGalleryDetail(id: string): Promise<GalleryInfo | null> {
    if (memoryGalleryCache.has(id)) return memoryGalleryCache.get(id)!;
    const localPath = path.join(GALLERY_CACHE_DIR, `${id}.json`);
    const cached = await readJsonFile<GalleryInfo>(localPath);
    if (cached) {
        memoryGalleryCache.set(id, cached);
        return cached;
    }

    try {
        const res = await fetchWithTimeout(`https://${DOMAIN}/galleries/${id}.js`);
        if (!res.ok) return null;

        const text = await res.text();
        const jsonStr = text.replace("var galleryinfo = ", "");
        let data;
        try { data = JSON.parse(jsonStr); } catch { return null; }

        const galleryInfo: GalleryInfo = {
            id: String(data.id),
            title: data.title,
            type: data.type,
            language: data.language,
            tags: data.tags?.map((t: any) => t.tag) || [],
            artists: data.artists?.map((a: any) => a.artist) || [],
            groups: data.groups?.map((g: any) => g.group) || [],
            series: data.parodys?.map((p: any) => p.parody) || [],
            characters: data.characters?.map((c: any) => c.character) || [],
            files: data.files.map((f: any) => ({
                name: f.name, width: f.width, height: f.height, hash: f.hash, haswebp: f.haswebp
            })),
        };

        memoryGalleryCache.set(id, galleryInfo);
        writeJsonFile(localPath, galleryInfo);

        return galleryInfo;
    } catch (e) {
        return null;
    }
}

export async function getGalleries(page = 1, limit = 24, filter?: string): Promise<GalleryInfo[]> {
    const targetIds = await fetchIds(filter || 'index');

    const start = (page - 1) * limit;
    const end = start + limit;
    const pageIds = targetIds.slice(start, end).map(String);

    const galleries = await Promise.all(pageIds.map(id => getGalleryDetail(id)));

    return galleries.filter((g): g is GalleryInfo => g !== null);
}

export async function getImageUrl(hash: string): Promise<string> {
    const gg = await getGG();
    const subdomain = await getSubdomain(hash);
    const path = `${gg.b}${s(hash)}/${hash}`;
    return `https://${subdomain}.gold-usergeneratedcontent.net/${path}.avif`;
}