"""
model_service.py — FastAPI sidecar that scores a phonation sample
=================================================================
The telephony service is Node, which can't import the scikit-learn pickle, so
the model runs here as a tiny HTTP sidecar (see MODEL_INTEGRATION.md → "If the
server is NODE"). Node POSTs the caller's captured "ahhh" and gets back a risk.

Wire format: the Node side captures Twilio's native audio — raw 8 kHz G.711
μ-law bytes — and POSTs them verbatim as the request body. We decode those bytes
to a WAV and run the same `screen_*` pipeline the model was trained against (8 kHz),
so the call feeds the model its native sample rate with no domain shift.

Run:  uvicorn model_service:app --port 8000
"""

import os
import tempfile

from fastapi import FastAPI, Request
from screen import load_model, mulaw_to_wav, screen_wav

app = FastAPI(title="AI-PI voice-screening model service")

# Load the model ONCE at startup, not per request — pickle load is slow.
MODEL, FEATURES = load_model()


@app.get("/health")
def health() -> dict:
    """Liveness probe; also confirms the model loaded and how many features it expects."""
    return {"status": "ok", "features": len(FEATURES)}


@app.post("/score")
async def score(request: Request) -> dict:
    """
    Score raw 8 kHz G.711 μ-law bytes (Twilio's wire format) sent as the request body.

    Returns {"risk": float in 0..1} normally, or {"risk": null} when the audio had
    no clear pitch (silence/noise/not a sustained vowel) — the caller decides what
    to do with null (the agent asks the caller to try again). The app, not the
    model, owns the 0.38 decision threshold and the spoken phrasing.
    """
    mulaw_bytes = await request.body()

    # screen.py's screen_mulaw leaks its temp file; do the temp handling here so
    # we can clean up. mulaw_to_wav -> screen_wav is exactly what it does inside.
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        path = f.name
    try:
        mulaw_to_wav(mulaw_bytes, path)
        risk = screen_wav(path, MODEL, FEATURES)
    finally:
        try:
            os.remove(path)
        except OSError:
            pass

    return {"risk": risk}  # null when no clear pitch
