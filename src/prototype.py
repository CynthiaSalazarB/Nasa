"""
prototype.py: the simplest working circadian prototype.

Three steps, one person:
  1. Calculate their circadian rhythm (DLMO) from real wearable data, and
     check it against melatonin timing NASA measured in astronauts (DSO 484).
  2. Show one of their good nights next to one of their bad nights.
  3. Simulate how their body clock shifts if the same person, on the same
     sleep schedule, lived under ISS cabin lighting (NASA SSLA values),
     plus a "personal sun" countermeasure and NASA NEEMO habitat light.

Run from the repo root:
    python src/prototype.py              # default person
    python src/prototype.py --subject P1277

Outputs go to data/processed/prototype/:
    1_circadian_rhythm.png, 2_good_vs_bad_night.png, 3_iss_light_shift.png,
    summary.json, plus the scenario input CSVs.

Data and sources
  Wearable data: Angelova et al. (2021), Chronic insomnia and bed partner
      actigraphy data, https://doi.org/10.5061/dryad.b8gtht7bh (CC0).
      Healthy partners only. Converted by src/actiware_to_dlmo.py.
  Model: predicting_dlmo (Huang, Mayer, Walch), MIT licence. St. Hilaire 2007
      model of the human circadian clock. third_party/predicting_dlmo
  ISS light: Maida, NASA JSC (2016), SSLA, NTRS 20160005080, slide 12
      (lux at 30 in, US Lab mid-module, read from chart: General ~250 lux,
      Pre-sleep ~105 lux, Phase-shift ~500 lux).
  NEEMO light: NASA LSDA NEEMO-ACTIWATCH (doi 10.83263/skft-eh56), ~12 lux
      average in-habitat illumination (read from figure).
  Astronaut melatonin: NASA LSDA DSO 484, Whitson et al. 1995, J Pineal Res.

Everything in step 3 is a model simulation, not a measurement.
"""
from __future__ import annotations

import argparse
import json
import tempfile
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.dates as mdates  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from dlmo import predict_dlmo, to_clock  # noqa: E402

REPO = Path(__file__).resolve().parent.parent
INPUT_DIR = REPO / "data" / "processed" / "predicting_dlmo_input"
OUT_DIR = REPO / "data" / "processed" / "prototype"
DSO484 = REPO / "data" / "dso484_astronaut_phase_shifts.csv"

# ISS cabin light (NASA SSLA, approximate lux)
ISS_GENERAL_LUX = 250
ISS_PRESLEEP_LUX = 105
ISS_PHASESHIFT_LUX = 500
NEEMO_LUX = 12

# Melatonin peaks roughly ~5 h after DLMO (approximate, used only for the plausibility check)
DLMO_TO_PEAK_HOURS = 5.0
MIN_SLEEP_EPISODE_MIN = 30

COLORS = {"Earth": "#2a6f97", "ISS cabin": "#c8553d", "NEEMO habitat": "#7b6d8d", "NEEMO + personal sun": "#3a7d44"}


# --------------------------------------------------------------------------
# Loading
# --------------------------------------------------------------------------
def load_subject(subject: str) -> pd.DataFrame:
    df = pd.read_csv(INPUT_DIR / f"{subject}.csv")
    df["timestamp"] = pd.to_datetime(df["Date"] + " " + df["Time"], format="%m/%d/%Y %I:%M:%S %p")
    df["asleep"] = (df["Sleep/Wake"] == 0).astype(int)
    return df


def write_model_csv(df: pd.DataFrame, path: Path) -> Path:
    out = df[["Date", "Time", "Activity", "White Light", "Sleep/Wake"]]
    path.write_text(out.to_csv(index=False, lineterminator="\n").rstrip("\n"))
    return path


# --------------------------------------------------------------------------
# Sleep episodes and nights
# --------------------------------------------------------------------------
def sleep_episodes(df: pd.DataFrame) -> pd.DataFrame:
    """Runs of sleep epochs at least MIN_SLEEP_EPISODE_MIN long (short wake gaps < 30 min merged)."""
    epoch_min = df["timestamp"].diff().median().total_seconds() / 60
    asleep = df["asleep"].to_numpy()
    # merge short wake gaps inside sleep
    gap_epochs = int(30 / epoch_min)
    filled = asleep.copy()
    i = 0
    while i < len(filled):
        if filled[i] == 0:
            j = i
            while j < len(filled) and filled[j] == 0:
                j += 1
            if i > 0 and j < len(filled) and (j - i) < gap_epochs:
                filled[i:j] = 1
            i = j
        else:
            i += 1
    episodes, start = [], None
    for k, v in enumerate(filled):
        if v and start is None:
            start = k
        if (not v or k == len(filled) - 1) and start is not None:
            end = k if not v else k + 1
            minutes = (end - start) * epoch_min
            if minutes >= MIN_SLEEP_EPISODE_MIN:
                seg = asleep[start:end]
                episodes.append({
                    "start": df["timestamp"].iloc[start],
                    "end": df["timestamp"].iloc[end - 1],
                    "time_in_bed_h": minutes / 60,
                    "sleep_h": seg.sum() * epoch_min / 60,
                })
            start = None
    return pd.DataFrame(episodes)


def nightly_summary(df: pd.DataFrame) -> pd.DataFrame:
    """Main sleep episode per night (night = noon to noon)."""
    eps = sleep_episodes(df)
    eps["night_of"] = (eps["start"] - pd.Timedelta(hours=12)).dt.date
    main = eps.sort_values("sleep_h").groupby("night_of").tail(1).sort_values("start")
    main["efficiency"] = main["sleep_h"] / main["time_in_bed_h"]
    main["onset_h"] = main["start"].dt.hour + main["start"].dt.minute / 60
    # keep complete nights only (not cut off at the start/end of the recording)
    main = main[(main["start"] > df["timestamp"].min() + pd.Timedelta(hours=1))
                & (main["end"] < df["timestamp"].max() - pd.Timedelta(hours=1))]
    main = main[main["sleep_h"] >= 3]   # shorter "nights" are mostly watch-off gaps, not real nights
    return main.reset_index(drop=True)


def pick_good_bad(nights: pd.DataFrame) -> tuple[pd.Series, pd.Series]:
    """Good = long and efficient; bad = short or fragmented. Simple score."""
    median_onset = nights["onset_h"].where(nights["onset_h"] > 12, nights["onset_h"] + 24).median()
    onset = nights["onset_h"].where(nights["onset_h"] > 12, nights["onset_h"] + 24)
    score = nights["sleep_h"] + 3 * nights["efficiency"] - 0.5 * (onset - median_onset).abs()
    return nights.loc[score.idxmax()], nights.loc[score.idxmin()]


# --------------------------------------------------------------------------
# Scenarios (step 3)
# --------------------------------------------------------------------------
def minutes_until_next_sleep(df: pd.DataFrame, episodes: pd.DataFrame) -> np.ndarray:
    ts = df["timestamp"].to_numpy()
    starts = np.sort(episodes["start"].to_numpy())
    idx = np.searchsorted(starts, ts)
    out = np.full(len(ts), np.inf)
    ok = idx < len(starts)
    out[ok] = (starts[idx[ok]] - ts[ok]) / np.timedelta64(1, "m")
    return out


def minutes_since_last_wake(df: pd.DataFrame, episodes: pd.DataFrame) -> np.ndarray:
    ts = df["timestamp"].to_numpy()
    ends = np.sort(episodes["end"].to_numpy())
    idx = np.searchsorted(ends, ts) - 1
    out = np.full(len(ts), np.inf)
    ok = idx >= 0
    out[ok] = (ts[ok] - ends[idx[ok]]) / np.timedelta64(1, "m")
    return out


def build_scenarios(df: pd.DataFrame) -> dict[str, pd.DataFrame]:
    """Same person, same sleep schedule; only the light changes."""
    eps = sleep_episodes(df)
    to_sleep = minutes_until_next_sleep(df, eps)
    since_wake = minutes_since_last_wake(df, eps)
    asleep = df["asleep"].to_numpy() == 1

    def scenario(awake_lux, presleep_lux=None, morning_lux=None):
        s = df.copy()
        light = np.full(len(s), float(awake_lux))
        if presleep_lux is not None:
            light[to_sleep <= 60] = presleep_lux          # warm pre-sleep mode, last hour before bed
        if morning_lux is not None:
            light[since_wake <= 120] = morning_lux        # bright phase-shift mode, first 2 h after waking
        light[asleep] = 0.0                               # dark crew quarters
        s["White Light"] = light.round(1)
        # The model swaps in activity counts when light < 100 lux (a fix for covered
        # light sensors). Here light is set by the cabin, so zero activity to keep it.
        s["Activity"] = 0
        return s

    return {
        "Earth": df.copy(),
        "ISS cabin": scenario(ISS_GENERAL_LUX, ISS_PRESLEEP_LUX),
        "NEEMO habitat": scenario(NEEMO_LUX),
        "NEEMO + personal sun": scenario(NEEMO_LUX, morning_lux=ISS_PHASESHIFT_LUX),
    }


def dlmo_by_day(df: pd.DataFrame, name: str) -> pd.DataFrame:
    """predicting_dlmo reports DLMO for the last day, so run it on growing slices ending at noon."""
    first_noon = df["timestamp"].min().normalize() + pd.Timedelta(hours=12)
    if first_noon <= df["timestamp"].min():
        first_noon += pd.Timedelta(days=1)
    rows = []
    cut = first_noon + pd.Timedelta(days=1)   # need at least ~1.5 days of data
    with tempfile.TemporaryDirectory() as tmp:  # slices are scratch files, kept out of the repo
        while cut <= df["timestamp"].max():
            part = df[df["timestamp"] <= cut]
            path = write_model_csv(part, Path(tmp) / f"slice_{cut:%m%d}.csv")
            dlmo = predict_dlmo(path)
            rows.append({"scenario": name, "evening_of": (cut - pd.Timedelta(days=1)).date(), "dlmo_hours": dlmo})
            cut += pd.Timedelta(days=1)
    return pd.DataFrame(rows)


def unwrap(h: pd.Series) -> pd.Series:
    """DLMO near midnight: show 1 am as 25 h so the line doesn't jump."""
    return h.where(h > 12, h + 24)


# --------------------------------------------------------------------------
# Charts
# --------------------------------------------------------------------------
def chart_rhythm(subject, dlmo_h, nights, out):
    dso = pd.read_csv(DSO484, comment="#")
    base = dso["melatonin_saliva_before"].dropna()
    peak = (dlmo_h + DLMO_TO_PEAK_HOURS) % 24

    fig, ax = plt.subplots(figsize=(10, 3.6))
    ax.axvspan(base.min(), base.max(), color="#c9c9c9", alpha=0.6,
               label=f"NASA DSO 484: astronauts' melatonin peak, normal life ({base.min():.1f}–{base.max():.1f} h)")
    ax.axvline(1.5, color="#888", ls=":", lw=1.5, label="DSO 484 control group melatonin peak (~1:30 am)")
    ax.axvline(peak if peak < 12 else peak - 24, color="#c8553d", lw=3,
               label=f"{subject}: estimated melatonin peak (~{to_clock(peak)})")
    onset = nights["onset_h"].where(nights["onset_h"] > 12, nights["onset_h"] + 24).median() - 24
    ax.axvline(dlmo_h - 24, color="#2a6f97", lw=3, label=f"{subject}: predicted DLMO ({to_clock(dlmo_h)})")
    ax.axvline(onset, color="#2a6f97", ls="--", lw=1.5, label=f"{subject}: typical sleep onset ({to_clock(onset % 24)})")
    ax.set_xlim(-8, 12)
    ticks = range(-8, 13, 2)
    ax.set_xticks(list(ticks), [to_clock(t % 24) for t in ticks])
    ax.set_yticks([])
    ax.set_title(f"Step 1: {subject}'s body clock, checked against NASA astronaut melatonin timing")
    ax.legend(loc="upper left", fontsize=8, frameon=False, bbox_to_anchor=(0, -0.18), ncol=2)
    fig.tight_layout()
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)


def chart_good_bad(df, good, bad, subject, out):
    fig, axes = plt.subplots(2, 1, figsize=(10, 6), sharex=False)
    for ax, (label, night) in zip(axes, [("Good night", good), ("Bad night", bad)]):
        start = pd.Timestamp(night["night_of"]) + pd.Timedelta(hours=18)
        win = df[(df["timestamp"] >= start) & (df["timestamp"] <= start + pd.Timedelta(hours=18))]
        ax.fill_between(win["timestamp"], 0, win["asleep"], step="mid", color="#2a6f97", alpha=0.25, label="asleep")
        ax2 = ax.twinx()
        ax2.plot(win["timestamp"], win["Activity"], color="#444", lw=0.7, label="activity")
        ax.set_ylim(0, 1.05)
        ax.set_yticks([])
        ax2.set_ylabel("activity counts")
        ax.set_title(f"{label} ({night['night_of']}): {night['sleep_h']:.1f} h of sleep, "
                     f"main sleep {night['start']:%H:%M}–{night['end']:%H:%M}", fontsize=10)
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
    fig.suptitle(f"Step 2: {subject}, good night vs. bad night (real wearable data)", fontsize=12)
    fig.tight_layout()
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)


def chart_shift(curves: pd.DataFrame, subject, out):
    fig, ax = plt.subplots(figsize=(10, 4.5))
    for name, g in curves.groupby("scenario", sort=False):
        ax.plot(np.arange(1, len(g) + 1), unwrap(g["dlmo_hours"]), marker="o",
                color=COLORS[name], lw=2.5 if name != "Earth" else 3, label=name)
    lo, hi = ax.get_ylim()
    ticks = np.arange(np.floor(lo), np.ceil(hi) + 1)
    ax.set_yticks(ticks, [to_clock(t % 24) for t in ticks])
    ax.invert_yaxis()
    ax.set_ylabel("predicted DLMO (later ↓)")
    ax.set_xlabel("day")
    ax.set_title(f"Step 3: same person, same schedule, different light (model simulation for {subject})")
    ax.legend(frameon=False, fontsize=9)
    ax.grid(alpha=0.3)
    fig.text(0, -0.04, f"ISS cabin = NASA SSLA modes (General ~{ISS_GENERAL_LUX} lux, Pre-sleep ~{ISS_PRESLEEP_LUX} lux in the hour before bed). "
             f"NEEMO = ~{NEEMO_LUX} lux all day (NASA NEEMO 5). Personal sun = SSLA Phase-shift ~{ISS_PHASESHIFT_LUX} lux for 2 h after waking.",
             fontsize=7.5, wrap=True)
    fig.tight_layout()
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)


# --------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--subject", default="P1044", help="Healthy partner ID (default P1044: 14 nights, 4.5%% gaps, typical sleep timing)")
    args = parser.parse_args()
    subject = args.subject

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df = load_subject(subject)
    nights = nightly_summary(df)

    # Step 1
    dlmo_h = predict_dlmo(INPUT_DIR / f"{subject}.csv")
    chart_rhythm(subject, dlmo_h, nights, OUT_DIR / "1_circadian_rhythm.png")

    # Step 2
    good, bad = pick_good_bad(nights)
    chart_good_bad(df, good, bad, subject, OUT_DIR / "2_good_vs_bad_night.png")

    # Step 3
    scenarios = build_scenarios(df)
    for name, s in scenarios.items():
        write_model_csv(s, OUT_DIR / f"scenario_{name.replace(' ', '_').replace('+', 'plus')}.csv")
    curves = pd.concat([dlmo_by_day(s, n) for n, s in scenarios.items()], ignore_index=True)
    curves.to_csv(OUT_DIR / "dlmo_by_day.csv", index=False)
    chart_shift(curves, subject, OUT_DIR / "3_iss_light_shift.png")

    final = curves.groupby("scenario", sort=False)["dlmo_hours"].last()
    earth = unwrap(pd.Series([final["Earth"]])).iloc[0]
    summary = {
        "subject": subject,
        "step1_predicted_dlmo": to_clock(dlmo_h),
        "step1_estimated_melatonin_peak": to_clock((dlmo_h + DLMO_TO_PEAK_HOURS) % 24),
        "step2_good_night": {"date": str(good["night_of"]), "sleep_h": round(good["sleep_h"], 1),
                             "efficiency": round(good["efficiency"], 2)},
        "step2_bad_night": {"date": str(bad["night_of"]), "sleep_h": round(bad["sleep_h"], 1),
                            "efficiency": round(bad["efficiency"], 2)},
        "step3_final_dlmo": {k: to_clock(v) for k, v in final.items()},
        "step3_shift_vs_earth_hours": {k: round(unwrap(pd.Series([v])).iloc[0] - earth, 2) for k, v in final.items()},
        "nights": len(nights),
    }
    (OUT_DIR / "summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
