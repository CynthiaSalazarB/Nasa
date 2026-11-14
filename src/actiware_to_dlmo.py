"""
actiware_to_dlmo.py
===================

Converts Actiware export files (Philips Respironics Actiwatch Spectrum) into
two formats:

1. **predicting_dlmo input CSVs**: one file per person, with exactly the
   columns the predicting_dlmo model reads:
       Date, Time, Activity, White Light, Sleep/Wake
   (Date = M/D/YYYY, Time = h:mm:ss AM/PM, Sleep/Wake: 1 = awake, 0 = asleep)

2. **Team master table**: one long CSV for all people, in our team data format:
       astronaut_id, timestamp, activity_count, light_lux, red_light,
       green_light, blue_light, is_awake, off_wrist, imputed

Dataset used:
    Angelova, M., Kusmakar, S., Karmakar, C., Zhu, Y., Shelyag, S.,
    Drummond, S., & Ellis, J. (2021). Chronic insomnia and bed partner
    actigraphy data [Dataset]. Zenodo. https://doi.org/10.5061/dryad.b8gtht7bh
    (CC0 1.0). We use the PARTNER folder (healthy cohabiting partners).

Model used:
    predicting_dlmo (Huang, Mayer, Walch), MIT licence,
    https://github.com/ojwalch/predicting_dlmo

Usage (from the repo root):
    python src/actiware_to_dlmo.py
    python src/actiware_to_dlmo.py --input "data/Supplementary Material_Final/Data/PARTNER" --output data/processed

Off-wrist gaps (watch not worn) are filled so the model gets a continuous
signal: activity -> 0, light and sleep/wake -> carried over from the last
valid reading. Every filled row is flagged `imputed = 1` in the master table.
"""

from __future__ import annotations

import argparse
import csv
import re
from pathlib import Path

import pandas as pd

# Columns as they appear in the Actiware export
ACTIWARE_COLUMNS = {
    "Date": "date",
    "Time": "time",
    "Off-Wrist Status": "off_wrist",
    "Activity": "activity_count",
    "White Light": "light_lux",
    "Red Light": "red_light",
    "Green Light": "green_light",
    "Blue Light": "blue_light",
    "Sleep/Wake": "is_awake",
}

DLMO_COLUMNS = ["Date", "Time", "Activity", "White Light", "Sleep/Wake"]


# --------------------------------------------------------------------------
# Reading
# --------------------------------------------------------------------------
def _find_header_row(lines: list[list[str]]) -> int:
    """The epoch-by-epoch table starts at the row 'Line, Date, Time, ... Activity ...'."""
    for i, row in enumerate(lines):
        if row[:3] == ["Line", "Date", "Time"] and "Activity" in row:
            return i
    raise ValueError("Could not find the epoch-by-epoch header row (Line, Date, Time, ..., Activity).")


def _read_metadata(lines: list[list[str]], header_row: int) -> dict:
    """Pull a few useful fields from the summary block above the data."""
    wanted = {
        "Identity:": "identity",
        "Gender:": "gender",
        "Time Zone:": "time_zone",
        "Epoch Length:": "epoch_seconds",
    }
    meta = {}
    for row in lines[:header_row]:
        if row and row[0] in wanted and len(row) > 1:
            meta[wanted[row[0]]] = row[1].strip()
    return meta


def subject_id_from_filename(path: Path) -> str:
    """'P1014_Acti_1_week_...csv' -> 'P1014' (and 'C1190 PART1_...' -> 'C1190')."""
    match = re.match(r"([A-Za-z]\d+)", path.name)
    return match.group(1) if match else path.stem


def read_actiware(path: str | Path) -> tuple[pd.DataFrame, dict]:
    """Read one Actiware export. Returns (epoch dataframe, metadata dict)."""
    path = Path(path)
    with open(path, encoding="utf-8-sig", errors="replace", newline="") as f:
        lines = list(csv.reader(f))

    header_row = _find_header_row(lines)
    meta = _read_metadata(lines, header_row)
    meta["subject_id"] = subject_id_from_filename(path)
    meta["source_file"] = path.name

    header = lines[header_row]
    rows = [r for r in lines[header_row + 1:] if len(r) >= len(header) - 1 and r[0].strip()]
    df = pd.DataFrame(rows, columns=header[: len(rows[0])] if rows else header)

    missing = [c for c in ACTIWARE_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"{path.name}: missing columns {missing}")

    df = df[list(ACTIWARE_COLUMNS)].rename(columns=ACTIWARE_COLUMNS)

    # Actiware uses day/month/year (this dataset was recorded in Australia)
    df["timestamp"] = pd.to_datetime(
        df["date"] + " " + df["time"], format="%d/%m/%Y %I:%M:%S %p", errors="coerce"
    )
    df = df.drop(columns=["date", "time"]).dropna(subset=["timestamp"])

    numeric = ["off_wrist", "activity_count", "light_lux", "red_light",
               "green_light", "blue_light", "is_awake"]
    df[numeric] = df[numeric].apply(pd.to_numeric, errors="coerce")

    df.insert(0, "astronaut_id", meta["subject_id"])
    return df.sort_values("timestamp").reset_index(drop=True), meta


# --------------------------------------------------------------------------
# Cleaning
# --------------------------------------------------------------------------
def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Fill off-wrist / missing epochs so the model gets a continuous signal."""
    df = df.copy()
    gap = df[["activity_count", "light_lux", "is_awake"]].isna().any(axis=1) | (df["off_wrist"] == 1)
    df["imputed"] = gap.astype(int)

    df["activity_count"] = df["activity_count"].fillna(0)
    for col in ["light_lux", "red_light", "green_light", "blue_light"]:
        df[col] = df[col].ffill().bfill().fillna(0).clip(lower=0)
    df["is_awake"] = df["is_awake"].ffill().bfill().fillna(1).round().astype(int)
    df["off_wrist"] = df["off_wrist"].fillna(1).astype(int)
    return df


# --------------------------------------------------------------------------
# Writing
# --------------------------------------------------------------------------
def to_dlmo_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Reshape into predicting_dlmo's columns and date/time formats."""
    ts = df["timestamp"]
    out = pd.DataFrame({
        # M/D/YYYY without leading zeros, e.g. 2/20/2019
        "Date": ts.dt.month.astype(str) + "/" + ts.dt.day.astype(str) + "/" + ts.dt.year.astype(str),
        # h:mm:ss AM/PM without a leading zero on the hour, e.g. 8:16:30 PM
        "Time": ts.dt.strftime("%I:%M:%S %p").str.lstrip("0"),
        "Activity": df["activity_count"].round(2),
        "White Light": df["light_lux"].round(2),
        "Sleep/Wake": df["is_awake"].astype(int),
    })
    return out[DLMO_COLUMNS]


def write_dlmo_csv(df: pd.DataFrame, path: str | Path) -> None:
    """predicting_dlmo splits lines on plain commas, so: no quotes, no trailing blank line."""
    text = to_dlmo_frame(df).to_csv(index=False, quoting=csv.QUOTE_NONE, lineterminator="\n")
    Path(path).write_text(text.rstrip("\n"))


# --------------------------------------------------------------------------
# Batch conversion
# --------------------------------------------------------------------------
def convert_folder(input_dir: str | Path, output_dir: str | Path) -> pd.DataFrame:
    input_dir, output_dir = Path(input_dir), Path(output_dir)
    dlmo_dir = output_dir / "predicting_dlmo_input"
    dlmo_dir.mkdir(parents=True, exist_ok=True)

    frames, summary = [], []
    for path in sorted(input_dir.glob("*.csv")):
        try:
            df, meta = read_actiware(path)
        except ValueError as err:
            print(f"SKIPPED {path.name}: {err}")
            continue
        frames.append(df.assign(source_file=meta["source_file"]))
        summary.append(meta)

    if not frames:
        raise SystemExit(f"No Actiware files found in {input_dir}")

    master = pd.concat(frames, ignore_index=True)

    # Some subjects were split into PART1/PART2 files: merge by subject id
    cleaned = []
    for subject_id, group in master.groupby("astronaut_id", sort=True):
        group = (group.drop(columns="source_file")
                      .drop_duplicates(subset="timestamp")
                      .sort_values("timestamp"))
        group = clean(group)
        write_dlmo_csv(group, dlmo_dir / f"{subject_id}.csv")
        cleaned.append(group)
        days = (group["timestamp"].max() - group["timestamp"].min()).total_seconds() / 86400
        print(f"{subject_id}: {len(group):>6} epochs, {days:4.1f} days, "
              f"{100 * group['imputed'].mean():4.1f}% filled -> {dlmo_dir / (subject_id + '.csv')}")

    master_clean = pd.concat(cleaned, ignore_index=True)
    master_cols = ["astronaut_id", "timestamp", "activity_count", "light_lux", "red_light",
                   "green_light", "blue_light", "is_awake", "off_wrist", "imputed"]
    master_clean[master_cols].to_csv(output_dir / "master_actigraphy.csv", index=False)
    pd.DataFrame(summary).to_csv(output_dir / "subjects.csv", index=False)
    print(f"\nWrote {len(cleaned)} predicting_dlmo files to {dlmo_dir}")
    print(f"Wrote master table ({len(master_clean)} rows) to {output_dir / 'master_actigraphy.csv'}")
    return master_clean


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", default="data/Supplementary Material_Final/Data/PARTNER",
                        help="Folder of Actiware export CSVs (default: healthy partners)")
    parser.add_argument("--output", default="data/processed", help="Where to write the converted files")
    args = parser.parse_args()
    convert_folder(args.input, args.output)


if __name__ == "__main__":
    main()
