import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { verifyAdminToken, extractBearerToken } from '@/lib/serverAuth';

// This is the token-generation endpoint for Vercel Blob's client-upload flow:
// the browser never gets a Blob write token directly — it asks this route
// for a short-lived one, which we only hand out after checking the same
// admin session token every other write endpoint requires. The actual file
// bytes go straight from the browser to Blob storage, not through this
// server, so uploads aren't bottlenecked by (or billed against) function
// execution time.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const token = extractBearerToken(request);

  if (!sessionSecret || !verifyAdminToken(token, sessionSecret)) {
    return NextResponse.json({ error: 'Unauthorized. Log in again.' }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
        maximumSizeInBytes: 10 * 1024 * 1024, // 10MB per photo
        addRandomSuffix: true,
      }),
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed.' },
      { status: 400 }
    );
  }
}
