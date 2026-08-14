import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';

type EmbedResult = { embedding: number[]; face_count: number };
type VerifyResult = {
  match: boolean;
  score: number;
  threshold: number;
  face_count?: number;
};

const faceUrl = (p: string): string =>
  `${env.FACE_SERVICE_URL.replace(/\/$/, '')}${p}`;

const fileToBlob = async (absolutePath: string): Promise<Blob> => {
  const buf = await fs.readFile(absolutePath);
  const ext = path.extname(absolutePath).toLowerCase();
  const type =
    ext === '.png'
      ? 'image/png'
      : ext === '.webp'
        ? 'image/webp'
        : 'image/jpeg';
  return new Blob([buf], { type });
};

export const embedFaceImage = async (absolutePath: string): Promise<EmbedResult> => {
  const form = new FormData();
  form.append('image', await fileToBlob(absolutePath), path.basename(absolutePath) || 'face.jpg');

  // Native FormData — do not set Content-Type (boundary is set by fetch).
  const res = await fetch(faceUrl('/embed'), {
    method: 'POST',
    body: form,
  });

  const json = (await res.json().catch(() => ({}))) as {
    detail?: string | Array<{ msg?: string }>;
    embedding?: number[];
    face_count?: number;
  };

  if (!res.ok) {
    const detail =
      typeof json.detail === 'string'
        ? json.detail
        : Array.isArray(json.detail)
          ? json.detail.map((d) => d.msg).filter(Boolean).join('; ')
          : '';
    throw new Error(detail || 'Face embedding failed — is the face service running?');
  }
  if (!json.embedding?.length) {
    throw new Error('No face embedding returned');
  }
  return { embedding: json.embedding, face_count: json.face_count ?? 1 };
};

export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
};

export const verifyLiveAgainstEmbedding = async (
  liveAbsolutePath: string,
  referenceEmbedding: number[],
): Promise<VerifyResult> => {
  // Local compare after one /embed call — faster than round-tripping /verify.
  const { embedding, face_count } = await embedFaceImage(liveAbsolutePath);
  const threshold = env.FACE_MATCH_THRESHOLD;
  const score = cosineSimilarity(embedding, referenceEmbedding);
  return {
    match: score >= threshold,
    score,
    threshold,
    face_count,
  };
};

export type GalleryFace = { id: string; name?: string; embedding: number[] };

/** Embed live photo once, compare against every registered face, return best match above threshold. */
export const identifyLiveAmongGallery = async (
  liveAbsolutePath: string,
  gallery: GalleryFace[],
): Promise<{
  match: boolean;
  userId?: string;
  userName?: string;
  score: number;
  threshold: number;
}> => {
  const threshold = env.FACE_MATCH_THRESHOLD;
  if (!gallery.length) {
    return { match: false, score: 0, threshold };
  }

  const { embedding: liveEmb } = await embedFaceImage(liveAbsolutePath);

  let best: GalleryFace | undefined;
  let bestScore = -1;
  for (const candidate of gallery) {
    const score = cosineSimilarity(liveEmb, candidate.embedding);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (!best || bestScore < threshold) {
    return { match: false, score: bestScore < 0 ? 0 : bestScore, threshold };
  }

  return {
    match: true,
    userId: best.id,
    userName: best.name,
    score: bestScore,
    threshold,
  };
};
