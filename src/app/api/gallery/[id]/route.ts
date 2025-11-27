import { NextResponse } from 'next/server';
import { getGalleryDetail } from '@/lib/gallery-service';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const gallery = await getGalleryDetail(id);

    if (!gallery) {
        return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    return NextResponse.json(gallery);
}