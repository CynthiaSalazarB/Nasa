"""
dlmo.py: call the predicting_dlmo model from Python.

predicting_dlmo is written in JavaScript, so this calls it through Node
(src/run_dlmo.js). Needs Node.js installed (`brew install node` on a Mac).

    from src.dlmo import predict_dlmo, predict_folder
    predict_dlmo("data/processed/predicting_dlmo_input/P1015.csv")   # -> 19.88 (7:53 pm)
    predict_folder("data/processed/predicting_dlmo_input")           # -> DataFrame

Or from the terminal (repo root):
    python src/dlmo.py
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent.parent
RUNNER = REPO_ROOT / "src" / "run_dlmo.js"
MODEL_JS = REPO_ROOT / "third_party" / "predicting_dlmo" / "js"


def predict_dlmo(csv_path: str | Path) -> float:
    """Predicted DLMO (clock hour, 0-24) for the last day of one recording."""
    out = subprocess.run(
        ["node", str(RUNNER), str(MODEL_JS), str(csv_path)],
        capture_output=True, text=True, check=True,
    )
    return json.loads(out.stdout.strip().splitlines()[-1])["dlmo_hours"]


def to_clock(hours: float) -> str:
    h = int(hours) % 24
    m = int(round((hours - int(hours)) * 60)) % 60
    return f"{h:02d}:{m:02d}"


def predict_folder(folder: str | Path) -> pd.DataFrame:
    rows = []
    for path in sorted(Path(folder).glob("*.csv")):
        dlmo = predict_dlmo(path)
        rows.append({"astronaut_id": path.stem, "dlmo_hours": dlmo, "dlmo_clock": to_clock(dlmo)})
    return pd.DataFrame(rows)


if __name__ == "__main__":
    results = predict_folder(REPO_ROOT / "data" / "processed" / "predicting_dlmo_input")
    print(results.to_string(index=False))
    results.to_csv(REPO_ROOT / "data" / "processed" / "dlmo_predictions.csv", index=False)
