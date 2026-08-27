import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createSSRClient } from '../../../../utils/supabase/server';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function isValidAvatarUrl(urlStr: string): boolean {
  if (typeof urlStr !== 'string' || !urlStr.trim()) return false;
  if (/^data:image\/(jpeg|png|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/.test(urlStr)) {
    return true;
  }
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'assets.sunshade.icu' ||
      hostname.endsWith('.sunshade.icu') ||
      hostname.endsWith('.supabase.co')
    ) {
      return true;
    }
  } catch (_) {
    return false;
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSSRClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const contentTypeHeader = req.headers.get('content-type') || '';

    // Handle Multipart Form Data
    if (contentTypeHeader.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = (formData as any).get('file') as (File & { arrayBuffer: () => Promise<ArrayBuffer>; name: string; type: string; size: number }) | null;

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
      }

      if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
        return NextResponse.json({
          error: 'Invalid file type. Only JPEG, PNG, WebP, GIF, and AVIF images are supported.',
        }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File size exceeds 5MB limit.' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = (file.name.split('.').pop() || 'png').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png';
      const fileKey = `avatars/${user.id}-${Date.now()}.${ext}`;

      let avatarUrl = '';

      // 1. Try Cloudflare R2 if configured
      if (
        process.env.R2_ACCOUNT_ID &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET_NAME
      ) {
        const r2 = new S3Client({
          region: 'auto',
          endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
          },
        });

        await r2.send(
          new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey,
            Body: buffer,
            ContentType: file.type,
          })
        );
        avatarUrl = `https://assets.sunshade.icu/${fileKey}`;
      } else {
        // 2. Try Supabase Storage 'avatars' bucket
        const { data: storageData, error: storageError } = await supabase.storage
          .from('avatars')
          .upload(fileKey, buffer, {
            contentType: file.type,
            upsert: true,
          });

        if (!storageError && storageData) {
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileKey);
          avatarUrl = publicUrlData.publicUrl;
        } else {
          // 3. Fallback to base64 Data URL
          avatarUrl = `data:${file.type};base64,${buffer.toString('base64')}`;
        }
      }

      // Update user auth metadata
      await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl },
      });

      // Try updating profiles table (graceful if column doesn't exist yet)
      try {
        await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', user.id);
      } catch (_) {
        // Ignore schema mismatch
      }

      return NextResponse.json({
        success: true,
        avatarUrl,
        message: 'Avatar uploaded successfully.',
      });
    }

    // Handle Direct JSON URL / Presigned Request
    const body = await req.json();
    const { avatarUrl, filename, contentType } = body;

    if (avatarUrl) {
      if (!isValidAvatarUrl(avatarUrl)) {
        return NextResponse.json({
          error: 'Invalid avatar URL. Must be an approved SunShade asset URL or valid image data URI.',
        }, { status: 400 });
      }

      await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl },
      });

      try {
        await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', user.id);
      } catch (_) {}

      return NextResponse.json({
        success: true,
        avatarUrl,
        message: 'Avatar updated successfully.',
      });
    }

    if (filename && contentType) {
      if (!ALLOWED_MIME_TYPES.has(contentType.toLowerCase())) {
        return NextResponse.json({ error: 'Invalid file type.' }, { status: 400 });
      }

      if (
        process.env.R2_ACCOUNT_ID &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET_NAME
      ) {
        const r2 = new S3Client({
          region: 'auto',
          endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
          },
        });

        const ext = (filename.split('.').pop() || 'png').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png';
        const fileKey = `avatars/${user.id}-${Date.now()}.${ext}`;

        const command = new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileKey,
          ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });
        const publicUrl = `https://assets.sunshade.icu/${fileKey}`;

        return NextResponse.json({ uploadUrl, publicUrl });
      }
    }

    return NextResponse.json({ error: 'Invalid request format.' }, { status: 400 });
  } catch (err: any) {
    console.error('Avatar upload error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
