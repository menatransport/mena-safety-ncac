// =============================================================================
// Media API client (ฝั่ง browser) — presign → PUT S3 → complete
// ยิงผ่าน proxy /api/media/* (ดู app/api/media/**) เพื่อไม่ต้อง expose media_api_url
// ให้ browser โดยตรง (ต่างจาก mena-go-lb ที่ยิง presign-api ตรงจาก client ได้เพราะ
// เปิด CORS ไว้ และ env เป็น VITE_* ที่ inline ลง bundle ได้)
// =============================================================================

export type MediaUploadResult = {
    mediaId: string;
    status: 'ready' | 'uploaded';
};

async function parseJson(res: Response) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data?.error || data?.detail?.detail || res.statusText;
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    return data;
}

async function presignMedia(file: File, userId: string, sourceType: string) {
    const res = await fetch('/api/media/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            filename: file.name,
            content_type: file.type || 'image/jpeg',
            file_size: file.size,
            user_id: userId,
            source_type: sourceType,
        }),
    });
    return parseJson(res);
}

async function putToS3(file: File, uploadUrl: string, contentType: string) {
    const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType || file.type || 'application/octet-stream' },
        body: file,
    });
    if (!res.ok && res.status !== 204) {
        throw new Error(`อัปโหลด S3 ไม่สำเร็จ (${res.status})`);
    }
}

async function completeMedia(mediaId: string, userId: string) {
    const res = await fetch(`/api/media/${mediaId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
    });
    return parseJson(res);
}

export async function deleteMedia(mediaId: string, userId: string) {
    const res = await fetch(`/api/media/${mediaId}?user_id=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
    });
    return parseJson(res).catch(() => {});
}

/** อัปโหลดรูป 1 ไฟล์แบบครบวงจร: presign → PUT S3 → complete. คืน media_id (string) */
export async function uploadMediaFile(
    file: File,
    userId: string,
    sourceType = 'repair_request',
): Promise<MediaUploadResult> {
    const presign = await presignMedia(file, userId, sourceType);
    const { media_id: mediaId, upload_url: uploadUrl } = presign;
    if (!mediaId || !uploadUrl) throw new Error('presign response ไม่ครบ');

    await putToS3(file, uploadUrl, presign.content_type || file.type);

    const complete = await completeMedia(mediaId, userId);
    return {
        mediaId: String(mediaId),
        status: complete?.status === 'ready' ? 'ready' : 'uploaded',
    };
}
