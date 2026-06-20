"""extract_features.py — turn a .wav of a sustained vowel into the 16 model features."""
import parselmouth
from parselmouth.praat import call

def extract_features(wav_path):
    snd = parselmouth.Sound(wav_path)
    pp = call(snd, "To PointProcess (periodic, cc)", 75, 600)

    def jit(kind): return call(pp, f"Get jitter ({kind})", 0, 0, 0.0001, 0.02, 1.3)
    def shim(kind): return call([snd, pp], f"Get shimmer ({kind})", 0, 0, 0.0001, 0.02, 1.3, 1.6)

    # ── Pitch: Fo (mean), Fhi (max), Flo (min) ─────────────────────────
    pitch = snd.to_pitch(pitch_floor=75, pitch_ceiling=600)
    f0_mean = call(pitch, "Get mean", 0, 0, "Hertz")
    f0_max  = call(pitch, "Get maximum", 0, 0, "Hertz", "Parabolic")
    f0_min  = call(pitch, "Get minimum", 0, 0, "Hertz", "Parabolic")

    # ── Noise: HNR (harmonicity) and NHR (its inverse-ish ratio) ───────
    harm = snd.to_harmonicity()        # harmonics-to-noise, in dB
    hnr  = call(harm, "Get mean", 0, 0)
    nhr  = 10 ** (-hnr / 10.0)         # convert HNR(dB) -> linear noise-to-harmonics

    rap  = jit("rap")
    apq3 = shim("apq3")

    return {
        "MDVP:Fo(Hz)":      f0_mean,
        "MDVP:Fhi(Hz)":     f0_max,
        "MDVP:Flo(Hz)":     f0_min,
        "MDVP:Jitter(%)":   jit("local"),
        "MDVP:Jitter(Abs)": jit("local, absolute"),
        "MDVP:RAP":         rap,
        "MDVP:PPQ":         jit("ppq5"),
        "Jitter:DDP":       rap * 3,            # exact: DDP ≡ 3 × RAP
        "MDVP:Shimmer":     shim("local"),
        "MDVP:Shimmer(dB)": shim("local_dB"),
        "Shimmer:APQ3":     apq3,
        "Shimmer:APQ5":     shim("apq5"),
        "MDVP:APQ":         shim("apq11"),      # MDVP:APQ in the dataset is the 11-point APQ
        "Shimmer:DDA":      apq3 * 3,           # exact: DDA ≡ 3 × APQ3
        "NHR":              nhr,
        "HNR":              hnr,
    }