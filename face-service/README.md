# Face recognition service (InsightFace ArcFace + RetinaFace via buffalo_l)

## Setup
```bash
cd face-service
python -m venv .venv
# Windows PowerShell (note the .\ prefix):
.\.venv\Scripts\Activate.ps1
# Windows CMD:
# .venv\Scripts\activate.bat
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
# Prefer 8090; if busy use 8091 (match FACE_SERVICE_URL in backend/.env)
uvicorn main:app --host 0.0.0.0 --port 8091
```

On Windows with Python 3.13, if `insightface` fails to build (needs Visual C++), the project venv may already be prepared — skip `pip install` and just activate + run uvicorn.

First run downloads the `buffalo_l` model (~300MB).

## Env
- `FACE_MATCH_THRESHOLD` — cosine similarity threshold (default `0.35`)

## Backend
Set in `backend/.env` (match the uvicorn port):
```
FACE_SERVICE_URL=http://127.0.0.1:8091
```
