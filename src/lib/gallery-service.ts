import fs from 'fs';
import path from 'path';
import https from 'https';
import { GalleryInfo } from "@/types";

// --- 설정 및 상수 ---
const DOMAIN = "ltn.gold-usergeneratedcontent.net";
const CACHE_ROOT = path.join(process.cwd(), '.cache');
const CACHE_DIRS = ['galleries', 'nozomi'].map(dir => path.join(CACHE_ROOT, dir));

// 캐시 디렉토리 생성
CACHE_DIRS.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// HTTPS 에이전트 (Keep-Alive 설정)
const agent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 10000,
    maxSockets: 50
});

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://hitomi.la/'
};

// --- GG (서브도메인 계산) 로직 ---
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

// --- 파일 유틸리티 ---
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

// --- [핵심] Nozomi 경로 및 필터링 로직 ---

/**
 * Pupil 앱의 SearchArgs 로직을 기반으로 .nozomi 파일 경로를 생성합니다.
 * @param category 필터 카테고리 (type, language, tag, artist 등)
 * @param value 필터 값 (manga, korean, male:shota 등)
 */
function getNozomiPath(category: string, value: string): string {
    // 공백을 언더바(_)로 치환 (Pupil의 sanitize/encode 로직 반영)
    const sanitizedValue = value.replace(/\s+/g, '_');

    // 1. 언어 (language:korean -> index-korean.nozomi)
    if (category === 'language' || category === 'languages') {
        return `index-${sanitizedValue}`;
    }

    // 2. 타입 (type:manga -> type/manga-all.nozomi)
    if (category === 'type' || category === 'types') {
        return `type/${sanitizedValue}-all`;
    }

    // 3. 태그 및 기타 메타데이터 처리
    // Pupil에서는 male:, female: 등을 포함한 태그를 'tag' area로 처리합니다.
    // 예: male:shota -> tag/male:shota-all.nozomi
    let area = category;

    // 복수형 처리 및 매핑
    if (category === 'tags') area = 'tag';
    else if (category === 'artists') area = 'artist';
    else if (category === 'series') area = 'series';
    else if (category === 'characters') area = 'character';
    else if (category === 'groups') area = 'group';

    // area가 tag, artist, series, character, group인 경우: {area}/{value}-all.nozomi
    return `${area}/${sanitizedValue}-all`;
}

/**
 * .nozomi 파일(바이너리)을 다운로드하고 파싱하여 ID 배열을 반환합니다.
 * (Big Endian 4-byte Integers)
 */
async function fetchNozomiIds(pathName: string): Promise<number[]> {
    // 파일명 안전하게 변환 (슬래시 -> 하이픈)하여 캐시 경로 생성
    const safeFileName = pathName.replace(/\//g, '-') + '.nozomi';
    const localPath = path.join(CACHE_ROOT, 'nozomi', safeFileName);

    try {
        let buffer: Buffer;

        try {
            // 1. 로컬 캐시 시도
            buffer = await fs.promises.readFile(localPath);
        } catch (e) {
            // 2. 원격 다운로드 (404 처리 포함)
            // Pupil은 compressed_nozomi_prefix = "n"을 사용하지 않고 직접 경로를 구성하기도 하지만
            // 웹에서는 보통 /path.nozomi 형태가 많음. 실패 시 /n/path.nozomi 시도 등 고려 가능하나
            // 여기서는 표준 경로 사용
            let url = `https://${DOMAIN}/${pathName}.nozomi`;

            // 예외: tag/ 등의 경로는 /n/ 접두사가 붙는 경우가 많음 (Pupil 참조)
            // Pupil: "$protocol//$domain/$compressed_nozomi_prefix/${args.area}..."
            // 즉, https://ltn.../n/tag/male:shota-all.nozomi
            if (pathName.includes('/')) {
                url = `https://${DOMAIN}/n/${pathName}.nozomi`;
            } else if (pathName.startsWith('index-')) {
                // index-korean.nozomi는 루트(n 없이)에 있는 경우도 있음. 
                // 하지만 Pupil 코드는 compressed_nozomi_prefix("n")를 씁니다.
                // 안전하게 n/을 붙입니다.
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

            // 캐시 저장
            await fs.promises.writeFile(localPath, buffer);
        }

        // 3. 바이너리 파싱
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

/**
 * 다중 필터 조건을 처리하여 최종 ID 목록을 반환합니다.
 * 로직: (Category A Union) INTERSECTION (Category B Union) ...
 */
export async function getFilteredGalleryIds(filters: FilterParams): Promise<number[]> {
    const categories = Object.keys(filters);

    // 필터가 없으면 전체 인덱스(index-all) 반환
    if (categories.length === 0) {
        // index-all.nozomi는 보통 /index-all.nozomi (루트) 또는 /n/index-all.nozomi
        // 여기서는 fetchNozomiIds 내부 로직에 맡김
        const ids = await fetchNozomiIds('index-all');
        return ids.sort((a, b) => b - a); // 최신순 정렬
    }

    // 각 카테고리별 ID 집합(Set) 수집
    const categoryIdSets: Set<number>[] = [];

    for (const cat of categories) {
        const values = filters[cat];
        if (!values || values.length === 0) continue;

        const unionSet = new Set<number>();

        // 병렬로 .nozomi 파일 다운로드
        const promises = values.map(val => fetchNozomiIds(getNozomiPath(cat, val)));
        const results = await Promise.all(promises);

        // 같은 카테고리 내에서는 합집합 (OR)
        results.forEach(ids => {
            ids.forEach(id => unionSet.add(id));
        });

        if (unionSet.size > 0) {
            categoryIdSets.push(unionSet);
        } else {
            // 필터 중 하나라도 결과가 0개면 교집합은 무조건 0개
            return [];
        }
    }

    if (categoryIdSets.length === 0) return [];

    // 카테고리 간 교집합 (AND)
    // 성능 최적화: 가장 작은 집합부터 처리
    categoryIdSets.sort((a, b) => a.size - b.size);

    let resultIds = Array.from(categoryIdSets[0]);

    for (let i = 1; i < categoryIdSets.length; i++) {
        const nextSet = categoryIdSets[i];
        // 현재 결과에서 다음 집합에 없는 것 제거
        resultIds = resultIds.filter(id => nextSet.has(id));
        if (resultIds.length === 0) break;
    }

    // 최신순(ID 내림차순) 정렬
    return resultIds.sort((a, b) => b - a);
}

// --- 갤러리 상세 정보 ---

const memoryGalleryCache = new Map<string, GalleryInfo>();

export async function getGalleryDetail(id: string): Promise<GalleryInfo | null> {
    if (memoryGalleryCache.has(id)) return memoryGalleryCache.get(id)!;

    const localPath = path.join(CACHE_ROOT, 'galleries', `${id}.json`);

    // 1. 디스크 캐시 확인
    const cached = await readJsonFile<GalleryInfo>(localPath);
    if (cached) {
        memoryGalleryCache.set(id, cached);
        return cached;
    }

    // 2. 원격 요청
    try {
        const res = await fetchWithTimeout(`https://${DOMAIN}/galleries/${id}.js`);
        if (!res.ok) return null;

        const text = await res.text();
        const jsonStr = text.replace("var galleryinfo = ", "");
        let data;
        try { data = JSON.parse(jsonStr); } catch { return null; }

        // 3. 데이터 정제 및 타입 매핑
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
                name: f.name,
                width: f.width,
                height: f.height,
                hash: f.hash,
                haswebp: f.haswebp
            })),
        };

        // 4. 캐시 저장
        memoryGalleryCache.set(id, galleryInfo);
        writeJsonFile(localPath, galleryInfo);

        return galleryInfo;
    } catch {
        return null;
    }
}

// --- 메인 API 함수 ---

export async function getGalleries(
    page = 1,
    limit = 24,
    filters: FilterParams = {}
): Promise<GalleryInfo[]> {
    // 1. 필터링된 전체 ID 목록 가져오기 (캐싱 및 교집합 연산 완료)
    const allIds = await getFilteredGalleryIds(filters);

    // 2. 페이지네이션 슬라이싱
    const start = (page - 1) * limit;
    const end = start + limit;

    // 범위를 벗어나면 빈 배열 반환
    if (start >= allIds.length) return [];

    const pageIds = allIds.slice(start, end);

    // 3. 상세 정보 병렬 가져오기
    const results = await Promise.all(pageIds.map(id => getGalleryDetail(String(id))));

    return results.filter((g): g is GalleryInfo => g !== null);
}

export async function getImageUrl(hash: string): Promise<string> {
    const gg = await getGG();
    const subdomain = await getSubdomain(hash);
    const path = `${gg.b}${s(hash)}/${hash}`;
    return `https://${subdomain}.gold-usergeneratedcontent.net/${path}.avif`;
}