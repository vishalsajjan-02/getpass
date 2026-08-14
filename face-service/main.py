"""
Face recognition microservice (InsightFace ArcFace + RetinaFace detection).

Endpoints:
  POST /embed   — multipart file "image" → { embedding: number[], face_count: int }
  POST /compare — JSON { embedding_a, embedding_b } OR multipart live + reference
                  → { match: bool, score: float, threshold: float }

Run:
  pip install -r requirements.txt
  uvicorn main:app --host 0.0.0.0 --port 8090
"""

from __future__ import annotations

import io
import os
from typing import Any

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

THRESHOLD = float(os.getenv("FACE_MATCH_THRESHOLD", "0.35"))

app = FastAPI(title="Gatepass Face Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_face_app = None


def get_face_app():
    global _face_app
    if _face_app is not None:
        return _face_app

    try:
        from insightface.app import FaceAnalysis
    except ImportError as exc:
        raise RuntimeError(
            "insightface is not installed. Run: pip install -r requirements.txt"
        ) from exc

    providers = ["CPUExecutionProvider"]
    # Prefer CUDA when available
    try:
        import onnxruntime as ort

        if "CUDAExecutionProvider" in ort.get_available_providers():
            providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
    except Exception:
        pass

    analysis = FaceAnalysis(name="buffalo_l", providers=providers)
    analysis.prepare(ctx_id=0, det_size=(640, 640))
    _face_app = analysis
    return _face_app


def read_image(data: bytes) -> np.ndarray:
    import cv2

    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image data")
    return img


def extract_embedding(img: np.ndarray) -> tuple[list[float], int]:
    faces = get_face_app().get(img)
    if not faces:
        raise HTTPException(status_code=400, detail="No face detected in the image")
    # Largest face by bbox area
    face = max(
        faces,
        key=lambda f: float((f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])),
    )
    emb = face.normed_embedding
    return emb.astype(float).tolist(), len(faces)


def cosine_similarity(a: list[float], b: list[float]) -> float:
    va = np.asarray(a, dtype=np.float64)
    vb = np.asarray(b, dtype=np.float64)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    if denom == 0:
        return 0.0
    return float(np.dot(va, vb) / denom)


class CompareBody(BaseModel):
    embedding_a: list[float]
    embedding_b: list[float]
    threshold: float | None = None


@app.get("/health")
def health() -> dict[str, Any]:
    ready = False
    try:
        get_face_app()
        ready = True
    except Exception as exc:
        return {"ok": False, "error": str(exc)}
    return {"ok": True, "model": "buffalo_l", "threshold": THRESHOLD, "ready": ready}


@app.post("/embed")
async def embed(image: UploadFile = File(...)) -> dict[str, Any]:
    data = await image.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty image")
    img = read_image(data)
    embedding, face_count = extract_embedding(img)
    return {"embedding": embedding, "face_count": face_count}


@app.post("/compare")
async def compare(body: CompareBody) -> dict[str, Any]:
    threshold = body.threshold if body.threshold is not None else THRESHOLD
    score = cosine_similarity(body.embedding_a, body.embedding_b)
    return {
        "match": score >= threshold,
        "score": round(score, 6),
        "threshold": threshold,
    }


@app.post("/verify")
async def verify(
    live: UploadFile = File(...),
    reference_embedding: str = Form(...),
    threshold: float | None = Form(None),
) -> dict[str, Any]:
    """Compare a live capture against a stored reference embedding (JSON array string)."""
    import json

    try:
        ref = json.loads(reference_embedding)
        if not isinstance(ref, list) or not ref:
            raise ValueError("bad embedding")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid reference_embedding JSON") from exc

    data = await live.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty live image")
    img = read_image(data)
    live_emb, face_count = extract_embedding(img)
    thr = float(threshold) if threshold is not None else THRESHOLD
    score = cosine_similarity(live_emb, [float(x) for x in ref])
    return {
        "match": score >= thr,
        "score": round(score, 6),
        "threshold": thr,
        "face_count": face_count,
    }
