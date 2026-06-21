# ZaraHack 2026 — Project Submission (HACKATHON.md)

> **AI-PI — a free phone line that screens your voice for early signs of Parkinson's.**

---

## 1. Team

*Who are you, and where does everything live?*
**(helps your score on: Team Work)**

- **Team name:** AI-PI
- **Repo:** https://github.com/MartiiPartii/AI-PI
- **Members (name — what each person did):**
  <!-- TODO: replace the GitHub handles with real names -->
  - **@MartiiPartii** — telephony service (Twilio + OpenAI Realtime voice agent), web app, SMS, deployment.
  - **@Yoshitd** — ML model (training, phone-degradation, evaluation) and model service integration.
- **How did you split the tasks? Who did what?:** We split along the three services: one of us owned the **conversational telephony layer** (the Node voice agent, Twilio call flow, SMS, and the Next.js site), the other owned the **ML model** (feature extraction, training on phone-degraded audio, subject-wise evaluation) and the **FastAPI scoring service** that connects the two.

---

## 2. What Problem Are You Solving?

*What's the problem, and who actually has it?*
**(helps your score on: Idea & Data Integrity)**

Parkinson's disease is usually caught late, even though subtle changes in the voice (an unsteady, breathy "ahhh") are one of the earliest measurable signs. The people most at risk — older adults — are also the least likely to install an app or visit a screening website. They feel it as "I didn't know anything was wrong until it was advanced." AI-PI meets them where they already are: a normal phone call, no app, no typing.

---

## 3. How Do You Solve It? (in plain language)

*Explain it to a normal person (grandpa style) — no tech words allowed.*
**(helps your score on: Presentation)**

You call a free phone number and a friendly voice answers. It asks you to take a breath and hold a steady "aaaah" for about five seconds, like at the doctor. A few seconds later it tells you, kindly, whether your voice shows signs that are worth getting checked — and it texts you the result too. It never says "you have Parkinson's"; it just nudges you to see a doctor if something looks off.

---

## 4. What Technologies Do You Use?

*List the building blocks: languages, frameworks, services, libraries, APIs.*
**(helps your score on: Tech Execution)**

- **Languages:** TypeScript (telephony + web), Python (ML / model service)
- **Telephony / orchestration:** Node.js, Express, `ws` (WebSocket), Twilio (Voice, Media Streams, Messaging/SMS)
- **Conversational AI:** OpenAI **GPT Realtime** API (speech-to-speech) + transcription
- **ML / audio:** scikit-learn (StandardScaler + LogisticRegression + CalibratedClassifierCV), **praat-parselmouth** (Praat) for acoustic features, pandas, numpy, joblib, audioop (G.711 μ-law)
- **Model service:** Python **FastAPI** + uvicorn
- **Frontend:** Next.js 16, React 19, Tailwind CSS, Radix / shadcn UI
- **Hosting / deployment:** Railway (FastAPI model service)
- **Data:** Italian Parkinson's Voice and Speech dataset (Hugging Face)

---

## 5. How Do You Wire Them Together?

*The architecture — how do the pieces talk to each other?*
**(helps your score on: Tech Execution)**

```
Caller's phone
   │ 8 kHz G.711 μ-law
   ▼
Twilio Voice  ──<Connect><Stream>──►  Node telephony service ◄──WebSocket──► OpenAI GPT Realtime
                                            │ (Bulgarian speech-to-speech agent)
                          on "begin_voice_capture": beep + record ~5 s "ahhh"
                                            │ raw μ-law bytes (HTTP POST)
                                            ▼
                                    FastAPI model service
                                 (μ-law → 8 kHz WAV → 10 Praat features → calibrated model)
                                            │ { risk }
                                            ▼
                          Node bands the risk (low / slightly / elevated / high)
                                   │                       │
                          agent SPEAKS the result     Twilio SMS summary
```

The call audio never leaves the live stream as a file — the captured "ahhh" is buffered as raw μ-law and POSTed to the model service, which decodes and scores it **during the call** so the agent can speak the result before hanging up. The Next.js site is the public-facing explainer.

---

## 6. Do You Train an ML Model?

*ML is a bonus, not a must — be honest either way.*
**(helps your score on: AI Fluency)**

Yes.
- **What it predicts:** the probability that a sustained-vowel recording shows Parkinson's-associated voice changes (a risk score 0–1).
- **Base model:** scikit-learn — a `LogisticRegression` (with `StandardScaler`) trained from scratch on acoustic features, wrapped in `CalibratedClassifierCV` (sigmoid) so the output is a calibrated probability.
- **How we train it:** from the Italian Parkinson's dataset, downsampled to 8 kHz and **phone-degraded** (real G.711 μ-law round-trip + 300–3400 Hz telephone bandpass + mild noise, 3 randomized variants per recording) so the training audio matches what Twilio actually delivers. We extract **10 features** with Praat (jitter: %, Abs, RAP, PPQ, DDP; shimmer: local, dB, APQ3, APQ5; and HNR).
- **How we check accuracy:** honest **subject-wise** cross-validation (`StratifiedGroupKFold`, grouped by speaker so no person is in both train and test — this prevents the leaky 90%+ "accuracy" you get otherwise). Result: ROC-AUC ≈ **0.84 ± 0.07** across 50 folds, with recall/precision/confusion reported at the decision thresholds.

---

## 7. What Datasets Do You Use, and How?

*Real, public data is the heart of this hackathon — show yours off.*
**(helps your score on: Idea & Data Integrity)**

We iterated through **three** public Parkinson's voice datasets. Each one taught us something the next had to fix — this is the core data-integrity story of the project.

**① Oxford Parkinson's Disease Detection Dataset** *(prototype — dropped)*
- **Source + link:** https://www.kaggle.com/datasets/pypiahmad/oxford-parkinsons-disease-detection-dataset (Little et al., UCI)
- **Why we tried it:** the classic starter dataset — pre-computed jitter/shimmer/HNR features with PD vs healthy labels, so we could model fast.
- **What we did / why we dropped it:** we hit 90%+ accuracy and nearly shipped it — until we realised it has only **~31 people** with several recordings each, and a naive split puts the *same person* in train and test. Switching to **subject-wise** evaluation collapsed the score, exposing that "accuracy" as leakage. Too small and too leaky to trust.

**② Istanbul / Sakar Parkinson's dataset** *(prototype — dropped)*
- **Source + link:** Sakar et al., 2018 (Istanbul University-Cerrahpaşa) — https://archive.ics.uci.edu/dataset/470/parkinson+s+disease+classification
- **Why we tried it:** much bigger (**252 subjects**), so subject-wise evaluation is meaningful. Honest subject-wise ROC-AUC ≈ **0.72** — believable, not leaky.
- **What we did / why we dropped it:** it's recorded at **44.1 kHz studio quality**. Fed real 8 kHz telephone audio, the sample-rate/bandwidth mismatch (domain shift) made the model flag **everyone**. A studio-trained model is the wrong tool for a phone line.

**③ Italian Parkinson's Voice and Speech** *(final model)*
- **Source + link:** https://huggingface.co/datasets/birgermoell/Italian_Parkinsons_Voice_and_Speech
- **Why this data:** it ships **raw audio** (not just pre-computed features) for both people **with Parkinson's** and **healthy controls**, including sustained phonation — so we can re-sample and degrade it to match the phone.
- **What we did to it:** labeled each file by its folder (Healthy Control = 0, People with Parkinson's = 1), **downsampled to 8 kHz**, applied the **phone-degradation** augmentation (G.711 μ-law round-trip + telephone bandpass + mild noise, 3 variants/recording), extracted the 10 acoustic features, and split **by speaker**. It's the only one of the three that matches the audio Twilio actually delivers — which is why it's the deployed model (subject-wise AUC ≈ 0.84).

---

## 8. How Will the Platform Scale?

*Imagine 10,000 people show up tomorrow — what happens?*
**(helps your score on: Adaptive Sustainability)**

The services are stateless and horizontally scalable — model inference is a logistic regression (sub-millisecond), and the model is loaded once per worker at startup. What breaks first is **not** our code: it's the **concurrent-call limits and cost of Twilio and the OpenAI Realtime API** (and, on a trial Twilio account, SMS length/verified-number limits). The fix is operational: more Twilio capacity, autoscaled Realtime worker pool, and a queue so calls degrade gracefully (e.g. "all lines busy, call back") instead of failing.

---

## 9. What Challenges Did You Face?

*Every project hits walls — tell us about yours and how you climbed over.*
**(helps your score on: Tech Execution)**

1. **Domain shift was brutal.** A model trained on clean audio flagged *everyone* on real calls. We diagnosed it by analysing real captures (phone audio inflates jitter/shimmer and lowers HNR) and fixed it by **retraining on phone-degraded audio** — a gated healthy capture that read 95% dropped to 24%.
2. **Phones fight steady vowels.** We found that handset noise-suppression treats a *steady* "ahhh" as background noise and chops it up, so the *healthiest* (steadiest) voices got the *worst* recordings. We confirmed this with frame-level signal analysis (gaps mid-vowel spiking shimmer) and added a hedged "slightly elevated" band to account for phone distortion.
3. **Honest evaluation.** Subject-wise splitting dropped our flattering accuracy to a realistic AUC — painful but correct.

---

## 10. Did You Check What Already Exists?

*Most teams skip this — so doing it is an easy way to stand out. ⭐*
**(helps your score on: Idea & Data Integrity)**

Yes — voice-based Parkinson's detection is an active research area (e.g. Max Little's work and the Parkinson's Voice Initiative / mPower study, which collect sustained-vowel recordings via apps and smartphones). Those efforts prove the signal is real, but they almost all require a **smartphone app or web upload**. Our twist is the **delivery channel**: a zero-install **phone call** with a patient, multilingual (Bulgarian-default) conversational agent built for elderly and non-technical callers — the exact people who won't install an app but will pick up a phone.

---

## 11. Where Did You Use AI, and What's Not Yours?

*Be open about your helpers — the rules require disclosing AI and third-party work.*
**(helps your score on: AI Fluency)**

- **AI tools used (and for what):** OpenAI **GPT Realtime** is the live voice agent (and the transcription model) — core product. **Claude (Claude Code)** and ChatGPT were used for development, debugging, and this write-up.
- **Third-party code / libraries reused:** Twilio SDK, OpenAI Realtime API, scikit-learn, praat-parselmouth, FastAPI/uvicorn, Next.js, Tailwind, Radix/shadcn UI; dataset from Hugging Face.
- **Their licences:** scikit-learn (BSD-3), parselmouth (GPL-3), FastAPI/Next.js/Tailwind/Radix/shadcn (MIT), Twilio/OpenAI SDKs (MIT). The dataset is used under its Hugging Face listing's terms for research.

---

## 12. Honesty Box

*The most underrated section. Tell us what's NOT done.*
**(helps your score on: Tech Execution)**

- **Known bug (orientation):** `model/screen.py` currently returns `P(class 0)`, but the deployed model labels Parkinson's as **class 1** — so the spoken/SMS risk reads **inverted** until a one-line `index(0)` → `index(1)` fix. The banding logic is correct; the direction isn't, right now.
- **Not clinically validated.** This is a screening *demo*, not a medical device. The thresholds/bands (40/60/80%) are heuristics; the dataset's healthy cohort has an age confound that makes the AUC optimistic.
- **Only valid on phone audio.** Because we trained on phone-degraded audio, clean studio recordings are now out-of-distribution and read falsely high — by design, but worth knowing.
- **Web app is a stub.** `web/` is a single info page. The account creation, login, dashboard, **database**, and phone-number-based result persistence described in `AGENTS.md` are **not implemented** yet.
- **Minor inconsistency:** the SMS uses a single 50% "see a doctor" cutoff while the agent uses the 4 bands — not yet fully unified.
- **Trial limits:** on a Twilio trial account, SMS length is capped (Cyrillic forces short messages) and only verified numbers can be called.
