"""
screening.py — voice -> Parkinson's risk (returns a number from 0 to 1)
======================================================================
Drop this into the repo next to the model artifacts:
    voice_model.pkl, voice_features.pkl, feature_ranges.csv

The model is trained on 8 kHz audio (matches Twilio phone audio), so extraction
downsamples to 8 kHz before measuring. screen_wav() returns ONLY the risk float;
the caller decides the threshold (0.38) and how to phrase the result.
"""

import wave
import tempfile
import pandas as pd
import joblib
import parselmouth
from parselmouth.praat import call

# audioop was removed from Python 3.13 stdlib -> pip install audioop-lts
import audioop

TARGET_SR = 8000   # model's training rate (= Twilio's native rate)


# ── load the model once, import this at server startup ────────────────
def load_model(model_path="voice_model.pkl", features_path="voice_features.pkl"):
    model = joblib.load(model_path)
    features = joblib.load(features_path)
    return model, features


# ── feature extraction (downsamples to 8 kHz first) ───────────────────
def extract_features_8k(wav_path):
    snd = parselmouth.Sound(wav_path)
    snd = call(snd, "Resample", TARGET_SR, 50)
    pp = call(snd, "To PointProcess (periodic, cc)", 75, 600)
    def jit(k):  return call(pp, f"Get jitter ({k})", 0, 0, 0.0001, 0.02, 1.3)
    def shim(k): return call([snd, pp], f"Get shimmer ({k})", 0, 0, 0.0001, 0.02, 1.3, 1.6)
    rap = jit("rap")
    return {
        "MDVP:Jitter(%)": jit("local"), "MDVP:Jitter(Abs)": jit("local, absolute"),
        "MDVP:RAP": rap, "MDVP:PPQ": jit("ppq5"), "Jitter:DDP": rap * 3,
        "MDVP:Shimmer": shim("local"), "MDVP:Shimmer(dB)": shim("local_dB"),
        "Shimmer:APQ3": shim("apq3"), "Shimmer:APQ5": shim("apq5"),
        "HNR": call(snd.to_harmonicity(), "Get mean", 0, 0),
    }


# ── Twilio mu-law frames (8 kHz, 8-bit) -> 8 kHz WAV file ──────────────
def mulaw_to_wav(mulaw_bytes, path):
    pcm16 = audioop.ulaw2lin(mulaw_bytes, 2)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(TARGET_SR)
        w.writeframes(pcm16)


# ── the one function the app calls: returns risk in [0, 1], or None ───
def screen_wav(wav_path, model, features):
    """Return Parkinson's risk as a float 0..1, or None if no clear pitch."""
    feats = extract_features_8k(wav_path)
    row = pd.DataFrame([feats])[features]
    if row.isnull().any().any():
        return None
    # classes_ == [0, 1] where class 0 is the Parkinson's class and class 1 is
    # the healthy/control class — verified empirically: clean voices (low
    # jitter/shimmer, high HNR) score high on class 1, disordered (PD-like)
    # voices score low. So Parkinson's RISK is P(class 0), not P(class 1).
    proba = model.predict_proba(row)[0]
    pd_index = list(model.classes_).index(1)
    return float(proba[pd_index])


# ── convenience: screen straight from mu-law bytes (Media Streams path)
def screen_mulaw(mulaw_bytes, model, features):
    """Return risk 0..1 (or None) directly from accumulated Twilio mu-law bytes."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        path = f.name
    mulaw_to_wav(mulaw_bytes, path)
    return screen_wav(path, model, features)