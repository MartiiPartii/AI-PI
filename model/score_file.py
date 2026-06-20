"""
score_file.py — extract the model's 10 features from a WAV and print the risk.

Usage:
    ./venv/bin/python score_file.py <path-to.wav>

If no path is given, it falls back to the bundled tuan.wav. Works on any WAV
(plain PCM or μ-law); extraction downsamples to 8 kHz internally, exactly as the
live call flow does.
"""

import json
import sys
import warnings

warnings.simplefilter("ignore")  # hide sklearn version / praat warnings

from screen import extract_features_8k, load_model, screen_wav

THRESHOLD = 0.38  # risk >= this is flagged elevated (app-side decision)


def main() -> None:
    path = sys.argv[1] if len(sys.argv) > 1 else "tuan.wav"

    model, features = load_model()

    print(f"file: {path}\n")
    print("10 features (8 kHz):")
    print(json.dumps(extract_features_8k(path), indent=2))

    risk = screen_wav(path, model, features)
    print(f"\nrisk = {risk}")
    if risk is None:
        print("-> no clear pitch (silence/noise) — the agent would ask to try again")
    else:
        verdict = "ELEVATED" if risk >= THRESHOLD else "low"
        print(f"-> {round(risk * 100)}%  ->  {verdict} (threshold {THRESHOLD})")


if __name__ == "__main__":
    main()
