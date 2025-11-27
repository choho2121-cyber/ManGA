import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
        return NextResponse.json([]);
    }

    try {
        let field = 'global';
        let term = query.replace(/_/g, ' ');

        if (term.includes(':')) {
            const parts = term.split(':');
            field = parts[0];
            term = parts[1];
        }

        // 경로 인코딩 로직
        const chars = term.split('').map(c => {
            if (c === ' ') return '_';
            if (c === '/') return 'slash';
            if (c === '.') return 'dot';
            return c;
        });

        const path = chars.join('/');
        const url = `https://tagindex.hitomi.la/${field}/${path}.json`;

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://hitomi.la/'
            }
        });

        if (!res.ok) {
            return NextResponse.json([]);
        }

        const data = await res.json();

        // [수정] 네임스페이스 처리 로직 강화
        const suggestions = data.map((item: any) => {
            const tagName = item[0];
            const count = item[1];
            const ns = item[2] || 'tag'; // Hitomi 응답의 3번째 요소가 네임스페이스

            let formattedTag = tagName;

            // 네임스페이스에 따라 접두사 붙이기
            if (ns === 'female' || ns === 'male') {
                formattedTag = `${ns}:${tagName}`;
            } else if (ns !== 'tag' && ns !== 'global') {
                // series, artist, group, character, language, type 등
                formattedTag = `${ns}:${tagName}`;
            }
            // 'tag' 네임스페이스는 접두사 없이 그대로 사용

            return {
                tag: formattedTag, // 화면 표시 및 저장용 (예: female:shota)
                count: count,
                ns: ns
            };
        });

        return NextResponse.json(suggestions);

    } catch (error) {
        return NextResponse.json([]);
    }
}