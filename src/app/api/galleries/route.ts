import { NextResponse } from 'next/server';
import { getGalleries } from '@/lib/gallery-service';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '24');

    try {
        const galleries = await getGalleries(page, limit);
        return NextResponse.json(galleries);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}