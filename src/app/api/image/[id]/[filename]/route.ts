import { NextResponse } from 'next/server';
import { getGalleryDetail, getImageUrl } from '@/lib/gallery-service';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string; filename: string }> }
) {
    const { id, filename } = await params;

    try {
        const gallery = await getGalleryDetail(id);
        const decodedName = decodeURIComponent(filename);

        const fileInfo = gallery?.files.find(f => f.name === decodedName);

        if (!fileInfo || !fileInfo.hash) {
            return new NextResponse('Image not found', { status: 404 });
        }

        const targetUrl = await getImageUrl(fileInfo.hash);

        const imageRes = await fetch(targetUrl, {
            headers: {
                'Referer': `https://hitomi.la/reader/${id}.html`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
            }
        });

        if (!imageRes.ok) {
            console.error(`Remote Error ${imageRes.status}: ${targetUrl}`);
            return new NextResponse(`Failed to fetch image (${imageRes.status})`, { status: 502 });
        }

        const imageBuffer = await imageRes.arrayBuffer();

        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': 'image/avif',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });

    } catch (error) {
        console.error("API Error:", error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}