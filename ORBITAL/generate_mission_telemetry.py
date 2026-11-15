"""Generate a fictional seven-day ORBITAL mission replay using only Python."""

import argparse
import csv
from datetime import datetime, timedelta, timezone
from pathlib import Path


ASTRONAUT_ID = "AST-01"
# Placeholder date. Noon-to-noon mission days keep each sleep episode together.
MISSION_START = datetime(2035, 1, 1, 12, tzinfo=timezone.utc)
SAMPLE_MINUTES = 5
DAY_MINUTES = 24 * 60
TARGET_SLEEP_START = 11 * 60  # 23:00
TARGET_WAKE = 19 * 60  # 07:00 the following morning
SLEEP_DELAYS_MINUTES = (0, 0, 0, 30, 60, 90, 90)

# (first minute from noon, simulated eye-level lux). These are scenario inputs.
ROUTINE_LIGHT = ((0, 300), (9 * 60, 30), (11 * 60, 0), (19 * 60, 300))
LATE_LIGHT = ((0, 300), (9 * 60, 150), (12 * 60, 30), (12 * 60 + 45, 0), (19 * 60, 300))


def write_telemetry(output_path):
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(("timestamp", "astronaut_id", "sleep_state", "cabin_light_lux"))

        for day_index, sleep_delay in enumerate(SLEEP_DELAYS_MINUTES):
            day_start = MISSION_START + timedelta(days=day_index)
            sleep_onset = TARGET_SLEEP_START + sleep_delay
            light_schedule = ROUTINE_LIGHT if day_index < 3 else LATE_LIGHT

            for minute in range(0, DAY_MINUTES, SAMPLE_MINUTES):
                timestamp = day_start + timedelta(minutes=minute)
                asleep = sleep_onset <= minute < TARGET_WAKE
                lux = next(level for start, level in reversed(light_schedule) if start <= minute)
                writer.writerow((
                    timestamp.isoformat(timespec="seconds"),
                    ASTRONAUT_ID,
                    "asleep" if asleep else "awake",
                    lux,
                ))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "output",
        nargs="?",
        type=Path,
        default=Path("orbital_synthetic_telemetry.csv"),
        help="Path to the output CSV",
    )
    args = parser.parse_args()
    write_telemetry(args.output)


if __name__ == "__main__":
    main()
