import { NextResponse } from 'next/server';
import { getGalleries, FilterParams } from '@/lib/gallery-service';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '24');

    // 쿼리 파라미터를 FilterParams 객체로 변환
    // 지원 카테고리: type, language, artist, series, tag, group, character
    const filters: FilterParams = {};
    const categories = ['type', 'language', 'artist', 'series', 'tag', 'group', 'character'];

    categories.forEach(key => {
        // 복수형(s)과 단수형 키 모두 확인하여 병합
        // 예: ?type=manga&types=doujinshi -> ['manga', 'doujinshi']
        const values = [
            ...searchParams.getAll(key),
            ...searchParams.getAll(key + 's') // types, languages 등 지원
        ];

        // 중복 제거 및 유효성 검사
        const uniqueValues = Array.from(new Set(values)).filter(v => v.trim() !== '');

        if (uniqueValues.length > 0) {
            filters[key] = uniqueValues;
        }
    });

    try {
        // 서비스 로직 호출
        const galleries = await getGalleries(page, limit, filters);

        // 캐시 헤더 설정 (선택사항, CDN 캐싱 등을 위해)
        return NextResponse.json(galleries, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
            }
        });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}