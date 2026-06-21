"""
score_file.py — extract the model's 10 features from a WAV and print the risk.

Usage:
    ./venv/bin/python score_file.py <path-to.wav>

If no path is given, it falls back to the bundled tuan.wav. Works on any WAV
(plain PCM or μ-law); extraction downsamples to 8 kHz internally, exactly as the
live call flow does.
"""

import os
import sys
import warnings

warnings.simplefilter("ignore")  # hide sklearn version / praat warnings

import pandas as pd

from screen import extract_features_8k, load_model, screen_wav

# Risk bands (on the 0..1 risk). The 40–60% band is hedged "slightly elevated"
# because phone distortion can nudge a healthy voice up. Mirrors risk-client.ts.
def risk_level(risk: float) -> str:
    if risk < 0.40:
        return "low"
    if risk < 0.60:
        return "slightly elevated (borderline — phone distortion can affect this)"
    if risk < 0.80:
        return "elevated"
    return "high"

# feature_ranges.csv lives next to this script (the model artifacts folder).
RANGES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "feature_ranges.csv")


def print_feature_table(feats: dict) -> None:
    """Print each feature's value and where it sits as a % of [lab_min, lab_max]."""
    ranges = pd.read_csv(RANGES_PATH).set_index("feature")
    print(f"{'feature':<18}{'value':>13}{'% of range':>13}   [min .. max]")
    for name, value in feats.items():
        lo = ranges.loc[name, "lab_min"]
        hi = ranges.loc[name, "lab_max"]
        span = hi - lo
        pct = (value - lo) / span * 100 if span else 0.0
        print(f"{name:<18}{value:>13.5f}{pct:>12.1f}%   [{lo:.5f} .. {hi:.5f}]")
    print("(% < 0 or > 100 means the value falls outside the training range)")


def main() -> None:
    path = sys.argv[1] if len(sys.argv) > 1 else "tuan.wav"

    model, features = load_model()

    print(f"file: {path}\n")
    print("10 features (8 kHz) — value and position within feature_ranges:")
    print_feature_table(extract_features_8k(path))

    risk = screen_wav(path, model, features)
    print(f"\nrisk = {risk}")
    if risk is None:
        print("-> no clear pitch (silence/noise) — the agent would ask to try again")
    else:
        print(f"-> {round(risk * 100)}%  ->  {risk_level(risk)}")


if __name__ == "__main__":
    main()
