# Model Integration Handoff — Parkinson's Voice Screening

This document is for **Claude Code** working inside the `AI-PI` repo. It explains
the trained model (which isn't in the repo's history), how it must be fed, and
the exact task: **wire the voice-screening model into the Twilio voice agent.**

---

## What this project is

A phone-based Parkinson's **screening** tool. A caller phones in, an AI voice
agent asks them to hold a steady "aaaah" for ~5 seconds, the audio is run through
a trained ML model, and the agent tells them their risk. It screens — it does
**not** diagnose.

---

## The model (context you don't have from the repo)

- **Type:** calibrated logistic regression (scikit-learn), scaler bundled inside
  the pickle via a Pipeline. Feed it RAW feature values — scaling happens internally.
- **Trained on:** the Italian Parkinson's Voice and Speech dataset, **downsampled
  to 8 kHz**, evaluated honestly subject-wise (no person in both train/test).
- **Why 8 kHz:** Twilio phone audio is 8 kHz μ-law (G.711). Training at 8 kHz means
  the call feeds the model its native sample rate — no domain shift. **Do not change
  this.** A 44.1 kHz model would degrade on phone audio.
- **Performance:** honest subject-wise ROC-AUC ≈ 0.86 (optimistic due to an age
  confound in the healthy cohort — fine for a demo, stated openly in the pitch).
- **Output:** a probability 0..1. The model returns ONLY this number now.
- **Decision threshold:** **0.38**. risk ≥ 0.38 → flag as elevated. (Tuned to favor
  recall — catch more true cases.) The APP applies this threshold, not the model.

### Model artifacts (must be in the repo, same folder as the screening code)
| File | What it is |
|---|---|
| `voice_model.pkl` | calibrated model, scaler baked in |
| `voice_features.pkl` | the 10 feature names, in order (feed columns in this order) |
| `feature_ranges.csv` | 8 kHz feature ranges (optional; for audio-quality checks) |

### The 10 features (extracted from audio with parselmouth, at 8 kHz)
`MDVP:Jitter(%)`, `MDVP:Jitter(Abs)`, `MDVP:RAP`, `MDVP:PPQ`, `Jitter:DDP`,
`MDVP:Shimmer`, `MDVP:Shimmer(dB)`, `Shimmer:APQ3`, `Shimmer:APQ5`, `HNR`

---

## The screening module (`screening.py`)

Add `screening.py` (provided) to the repo. Its public API:

```python
from screening import load_model, screen_wav, screen_mulaw, mulaw_to_wav

MODEL, FEATURES = load_model()          # call ONCE at startup, not per request

risk = screen_wav("sample.wav", MODEL, FEATURES)     # -> float 0..1, or None
risk = screen_mulaw(mulaw_bytes, MODEL, FEATURES)    # -> float 0..1, or None
```

- `screen_wav(path)` — for a WAV file (e.g. a Twilio `<Record>` download).
- `screen_mulaw(bytes)` — for accumulated Twilio Media Streams μ-law frames.
- Returns `None` if the audio had no clear pitch (silence/noise) — handle this:
  ask the caller to try again.
- Extraction downsamples to 8 kHz internally, so an already-8 kHz Twilio file is fine.

**The model returns only the risk number.** Deciding what the agent SAYS is the
app's job — apply the 0.38 threshold and phrase it (see "Phrasing" below).

---

## The integration task

Connect `screen_*()` into the existing Twilio voice flow. The approach depends on
the server language — **check the repo and pick one:**

### If the server is PYTHON (FastAPI/Flask + websockets)
1. Add `screening.py` + the 3 artifacts to the repo.
2. At server startup: `MODEL, FEATURES = load_model()`.
3. In the call flow, after capturing 5s of caller audio, call `screen_*()` and
   use the returned risk to drive what the agent says.
No separate service needed — import directly.

### If the server is NODE (most Twilio + OpenAI Realtime examples)
Node can't import a Python model. Run a tiny Python sidecar and call it over HTTP.
Create `model_service.py`:
```python
from fastapi import FastAPI, UploadFile
import tempfile
from screening import load_model, screen_wav
app = FastAPI()
MODEL, FEATURES = load_model()

@app.post("/screen")
async def screen(file: UploadFile):
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(await file.read()); path = f.name
    risk = screen_wav(path, MODEL, FEATURES)
    return {"risk": risk}     # null if no clear pitch
```
Run: `uvicorn model_service:app --port 8000`. The Node app POSTs the caller's WAV
to `http://localhost:8000/screen` and reads `{ risk }`.

---

## Audio capture — the part to get right

Twilio gives 8 kHz μ-law. Two ways to capture the 5-second "aaaah":

### Path A — Twilio `<Record>` (simpler, more robust — recommended)
- TwiML: `<Say>` the instruction, then `<Record maxLength="5" playBeep="true" />`.
- Twilio posts a recording URL; download the WAV; call `screen_wav()`.

### Path B — Media Streams (for the live Realtime conversation)
- `<Connect><Stream>` to a WebSocket; bridge to OpenAI Realtime (`g711_ulaw`).
- After the agent finishes the prompt, buffer **inbound** `media` frames:
  `mulaw_buffer += base64.b64decode(msg["media"]["payload"])`.
- Stop at `8000 * 5 = 40000` bytes (5 seconds), then `screen_mulaw(mulaw_buffer)`.
- **Trigger:** define a Realtime tool `start_voice_test`; flip capturing on when the
  model calls it. **Wait for the agent to finish speaking** (`response.done`) before
  capturing, or you'll record the AI's voice, not the caller's.

---

## Phrasing (app side, after getting `risk`)

Apply the threshold and speak a careful, fixed-safety message. Example:
```python
THRESHOLD = 0.38
if risk is None:
    say("I couldn't get a clear reading — let's try once more, a steady aaaah.")
elif risk >= THRESHOLD:
    say(f"Your screening came back elevated, around {round(risk*100)} percent. "
        "This is a screening, not a diagnosis — it means it's worth seeing a neurologist.")
else:
    say(f"Your screening came back low risk, around {round(risk*100)} percent. "
        "Remember this is a screening tool, not a diagnosis.")
```
> Keep the safety framing ("screening, not a diagnosis") fixed in code. Don't let the
> LLM freely improvise health wording — it might overstate or say "you have Parkinson's".
> Letting it phrase the *low-stakes* parts is fine; keep the clinical line controlled.

---

## Environment / dependencies

Python side runs in a **venv**:
```bash
python3 -m venv venv
source venv/bin/activate
pip install praat-parselmouth scikit-learn pandas numpy joblib audioop-lts
# + fastapi uvicorn  (if Node sidecar or a Python web server)
# + soxr             (only if bridging to OpenAI Realtime, which wants 24 kHz)
pip freeze > requirements.txt
```
(Node side uses `npm install`, not a venv — only the Python model service needs the venv.)

---

## Gotchas (these will bite)

- **`audioop` removed in Python 3.13** → `pip install audioop-lts`, or the μ-law decode
  throws `ModuleNotFoundError`.
- **scikit-learn version:** `joblib.load` can break if the runtime's sklearn differs a
  lot from the version that trained the model. Pin the same version in `requirements.txt`.
- **Load the model once** at startup, not per call (pickle load is slow).
- **Use the 8 kHz `feature_ranges.csv`**, never a 44.1 kHz one.
- **Don't capture audio too early** (Path B) — wait for the agent to stop talking.
- **`screen_*` can return `None`** — always handle the "try again" case.

---

## Definition of done

- [ ] `screening.py` + 3 artifacts in the repo; model loads at startup.
- [ ] Caller flow: prompt → record 5s "aaaah" → `screen_*()` → spoken risk.
- [ ] 0.38 threshold + fixed safety phrasing applied app-side.
- [ ] `None` (unclear audio) handled with a retry prompt.
- [ ] Tested end to end with a real call; healthy speaker lands below 0.38.
- [ ] A backup recording of a successful call exists (in case live telephony fails).

---

## What was done to get here (background)

1. Started on the Oxford dataset (31 people) — too small, leaky 90%+ accuracy.
2. Learned subject-wise evaluation; honest AUC was much lower.
3. Moved to the Sakar dataset (252 people, 44.1 kHz) — AUC ≈ 0.72.
4. Discovered phone audio is 8 kHz → 44.1 kHz model flagged everyone (domain shift).
5. Moved to the Italian dataset (raw audio), downsampled to **8 kHz** to match phones.
6. Fixed a labeling bug (the cache path contained "Parkinson", mislabeling everything).
7. Trained the final 8 kHz model: honest subject-wise AUC ≈ 0.86, threshold 0.38.
8. **Now:** integrate this model into the Twilio voice agent (this document).
