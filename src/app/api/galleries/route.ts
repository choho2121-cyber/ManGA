import { NextResponse } from 'next/server';
import { getGalleries, FilterParams } from '@/lib/gallery-service';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '24');

    const filters: FilterParams = {};
    const excludedFilters: FilterParams = {};

    const categories = ['type', 'language', 'artist', 'series', 'tag', 'group', 'character'];

    categories.forEach(key => {
        const values = [...searchParams.getAll(key), ...searchParams.getAll(key + 's')];
        const uniqueValues = Array.from(new Set(values)).filter(v => v.trim() !== '');
        if (uniqueValues.length > 0) filters[key] = uniqueValues;

        const exValues = [...searchParams.getAll(`exclude_${key}`), ...searchParams.getAll(`exclude_${key}s`)];
        const uniqueExValues = Array.from(new Set(exValues)).filter(v => v.trim() !== '');
        if (uniqueExValues.length > 0) excludedFilters[key] = uniqueExValues;
    });

    try {
        // [수정] 구조 분해 할당
        const { galleries, total } = await getGalleries(page, limit, filters, excludedFilters);

        // [수정] 응답 포맷 변경: 배열 -> 객체 { data, pagination }
        return NextResponse.json({
            data: galleries,
            pagination: {
                total,
                page,
                limit,
                hasMore: (page * limit) < total
            }
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
            }
        });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}