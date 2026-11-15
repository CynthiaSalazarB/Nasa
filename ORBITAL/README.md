# ORBITAL

ORBITAL is a browser-based NASA Space Apps prototype for replaying sleep telemetry and comparing the modeled circadian response to two cabin lighting schedules.

## Run locally

From this directory, run:

```bash
python serve.py
```

Open <http://localhost:8000>. The application has no package installation or build step.

## Demo

1. The console starts at the end of the seven-day replay. On night 7, AST-01 slept from 00:30 to 07:00 against a 23:00–07:00 target.
2. Switch nights, drag the replay slider, or play the full record. The telemetry chart plots eye-level illuminance and the sleep interval.
3. Change bedtime, wake time, dimming lead, or simulated pre-sleep lux. The forecast compares the latest replay light pattern repeated for three nights against the proposed schedule, starting both from the same estimated state.
4. Switch appearance among the ISS fixture modes. Candela and color temperature are fixture specifications. Simulated eye-level lux is the Forger99 input.
5. In Research data, filter UTMB by sleep metric and study phase, and select any of the eight DSO 484 subjects.

The replay uses a fictional astronaut, a placeholder mission date, UTC as the mission clock, and five-minute sampling. The forecast estimates dim-light melatonin onset (DLMO). It is a simulation of circadian timing, with sleep duration taken from the replay itself.

## Data and methods

- **Mission replay.** `python generate_mission_telemetry.py dist/data/orbital_synthetic_telemetry.csv` regenerates the bundled fictional telemetry. The sleep-state and light schedules are scenario inputs.
- **UTMB actigraphy.** The [NASA archive](https://nlsp.nasa.gov/search/data/details/e26501eb-7d7a-5012-8c8e-c5bdb3eecaf6?dataType=DATASETS) contains a ground-based bed-rest study. This demo uses the 69 observations labeled C1G0001 in Analyzed Data. Durations were converted from the original clock-style strings to minutes. Query Results were neither joined nor used.
- **DSO 484.** The [NASA archive](https://nlsp.nasa.gov/search/data/details/1bb44ffb-b00d-521a-bbeb-d8fcd036ad83?dataType=EXPERIMENTS) contains before-and-after hormone peak times from a prelaunch study combining sleep shifting and bright light. The bundled tidy CSV preserves reported and arithmetic delays and corrects seven misplaced decimal points against [Whitson et al., Table 1](https://zenodo.org/records/1230710/files/article.pdf). The dashboard uses urinary melatonin sulfate because it has complete data for all eight subjects.
- **ISS lighting.** [NASA’s crew-quarters guidance](https://ntrs.nasa.gov/api/citations/20200011570/downloads/20200011570.pdf) supplies the fixture modes and two-hour default pre-sleep lead. Eye-level lux values in the simulation are illustrative.
- **Model.** The browser port in `dist/model.mjs` implements Forger99 using the same equations, default constants, and RK4 solver as [Arcascope/circadian](https://github.com/arcascope/circadian). Source reference blob SHA: e5430e7eff0c91fc594ab32db91f081ec6d12763. The initial state is stabilized on 14 repetitions of the first replay day, then advanced through the synthetic light history. DLMO is estimated seven hours before the modeled core body temperature minimum. The NASA hormone observations serve as historical evidence for the concept. The simulation does not fit the model to those observations. The original MIT license is in `dist/LICENSE-arcascope.txt`.
