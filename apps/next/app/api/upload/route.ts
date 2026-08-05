import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createSSRClient } from '../../../utils/supabase/server';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  // 1. Verify Admin Auth
  const supabase = await createSSRClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if the user is an admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single();

  if (profile?.status !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Parse Request
  const { filename, contentType, gameSlug, assetType } = await req.json();

  if (!filename || !contentType || !gameSlug || !assetType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // 3. Generate Unique Key with timestamp to invalidate CDN cache
  const fileExt = filename.split('.').pop();
  const fileKey = `apps/${gameSlug}/${assetType}-${Date.now()}.${fileExt}`;

  // 4. Create Presigned URL
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
  });

  try {
    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });
    const publicUrl = `https://assets.sunshade.icu/${fileKey}`;

    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (err) {
    console.error('Failed to generate presigned URL', err);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
