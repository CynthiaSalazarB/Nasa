# Plan: NASA Space Apps 2026, team "NASA Gals +1", ORBITAL (sleep)

## Context
Challenge: "Create Health Monitoring Software for Astronauts on Space Missions". Team of 5. On Nov 15 the team
pivoted from a broad circadian copilot to **sleep only**, built on **ORBITAL**, the prototype Nora started in
nora-raad/nasa_hackathon and now in this repo under `ORBITAL/` (history kept).
Judged on Impact, Creativity, Validity, Relevance (NASA data integral), Presentation.

## 1. One-line product
ORBITAL replays an astronaut's sleep and light record, estimates their body clock, and tells them which bedtime,
wake time and lighting schedule will put their sleep back in sync with the mission.

## 2. What ORBITAL already does (baseline we build on)
- **Mission replay:** 7 nights for a fictional astronaut (AST-01), 5-minute samples, UTC mission clock. Charts
  eye-level light (lux) and sleep intervals. Night 7: slept 00:30 to 07:00 against a 23:00 to 07:00 target.
- **Lighting preview:** the user sets target bedtime, wake time, dimming lead and pre-sleep lux, and picks an ISS
  fixture mode (General, Pre-sleep, Alertness).
- **Three-night forecast:** Forger99 (browser port of [arcascope/circadian](https://github.com/Arcascope/circadian), MIT)
  compares the current light pattern against the proposed schedule and outputs estimated melatonin onset (DLMO,
  set 7 h before the modeled core body temperature minimum).
- **Research data tab:** UTMB bed-rest actigraphy (69 nights: sleep minutes, latency, efficiency) and NASA DSO 484
  (melatonin and cortisol peak times before and after a prelaunch sleep-shift + bright-light protocol, 8 subjects).
- **Stack:** plain HTML + JavaScript modules, no build step, `python -m http.server 8000 --directory dist`,
  deployed by a GitHub Actions Pages workflow.

Known limits (from its README): one synthetic astronaut, illustrative lux values, the model is not fitted to the
person or to the NASA observations, and the user picks the schedule by hand.

## 3. What we add (scope)

### Building
1. **Suggested schedule:** instead of only sliders, ORBITAL proposes the best bedtime, wake time, dimming lead and
   fixture mode inside the mission's sleep slot, with a one-line "why" (example: "Your clock runs 1 h 30 late.
   Start pre-sleep light at 21:00 and use Alertness light for 30 min after waking.").
2. **Personal fit:** estimate each astronaut's clock offset from their own replay instead of the default start
   state. Shown as "your clock vs the schedule" (minutes early or late).
3. **Real wristband replay:** load real Actiwatch Spectrum files (per-minute activity, white light lux, sleep/wake)
   into the replay, next to the synthetic astronaut.
4. **Sleep check-in + feedback:** morning check-in (sleep quality 1 to 5, sleepiness 1 to 9) and "did the plan help?"
   (better / same / worse). Stored in the browser; the next suggestion takes it into account.
5. **Shift planner:** for a known schedule shift (example: docking moves sleep 8 h on day 9), a 2 to 3 night plan of
   light and sleep times to arrive aligned.
6. **Escalation note:** "talk to the flight surgeon" after 3 nights under 6 h of sleep. No medication advice, ever.

### Not building, but it supports the pitch
- Training a model across many astronauts (needs NASA's archive and a data request).
- Real control of the station lights (ORBITAL previews them).
- Live wearable connection (we load exported files in the Actiwatch format).
- A language model for wording: on board it would be a local model; the demo uses template text.
- Moon and Mars days (24.65 h sol): the model accepts any light schedule; one slide.

### Out of scope
Daytime alertness coaching (caffeine, movement, naps), heart rate and breathing, sleep stages, hormones measured in
flight, medication, food.

## 4. Data

| Source | What it gives | Use |
|---|---|---|
| ORBITAL synthetic telemetry (`generate_mission_telemetry.py`) | 7 nights of sleep state + cabin lux, 5-min | Demo astronaut, scenario control |
| [UTMB bed-rest actigraphy (NASA NLSP)](https://nlsp.nasa.gov/search/data/details/e26501eb-7d7a-5012-8c8e-c5bdb3eecaf6?dataType=DATASETS) | sleep minutes, latency, efficiency per night | Real NASA sleep metrics, realistic ranges |
| [NASA DSO 484 (NLSP)](https://nlsp.nasa.gov/search/data/details/1bb44ffb-b00d-521a-bbeb-d8fcd036ad83?dataType=EXPERIMENTS), [Whitson et al.](https://zenodo.org/records/1230710/files/article.pdf) | hormone peak times before/after sleep shift + bright light | Evidence that light shifts the clock; model check |
| [ISS crew-quarters lighting guidance (NTRS)](https://ntrs.nasa.gov/api/citations/20200011570/downloads/20200011570.pdf) | fixture modes, 2 h default pre-sleep lead | Lighting options and default |
| [SSLA report (NTRS)](https://ntrs.nasa.gov/citations/20160005080) via `data/light.txt` | candela and approximate lux per setting | Replace illustrative lux (pre-sleep default ~105 lux is an estimate) |
| Actiwatch insomnia + partner data ([Angelova et al. 2021](https://doi.org/10.5061/dryad.b8gtht7bh)), in `data/` | 86 files, 7 nights, per-minute activity, white light, sleep/wake | Real wristband replays; personal-fit test |
| [OSDR Environmental Data App](https://visualization.osdr.nasa.gov/eda/) | ISS cabin temperature, CO2, humidity | Optional sleep-environment note |

NASA data in the demo: UTMB, DSO 484, crew-quarters guidance, SSLA values, OSDR (optional). Name each one on screen
where it is used.

## 5. What we compute
1. **Clock position:** Forger99 driven by the lux record, DLMO per night.
2. **Alignment:** DLMO compared with the target bedtime. Melatonin onset normally comes about 2 h before habitual
   sleep, so "aligned" = DLMO about 2 h before target bedtime (check the reference before the slides).
3. **Personal offset:** the start state that best matches the person's observed sleep onsets (grid search over
   offsets, shortcut until a better fit is needed).
4. **Suggestion:** try candidate schedules (bedtime and wake inside the mission sleep slot, dimming lead 1 to 3 h,
   fixture mode) in the forecast; pick the one whose night-3 DLMO lands closest to aligned with the fewest changes.
5. **Sleep metrics shown:** duration, onset vs target, and (for real files) efficiency, with UTMB ranges as reference.

## 6. Quantitative results
1. **Real-data check:** for each Actiwatch partner file (healthy), fit the offset on nights 1 to 5 and predict sleep
   onset on nights 6 and 7. Report median error in minutes.
2. **Schedule comparison (simulation):** same astronaut under (A) current light, (B) NASA default 2 h pre-sleep
   lead, (C) ORBITAL's suggested schedule. Report hours of misalignment on night 3 and nights to realign after an
   8 h shift.
3. **DSO 484 check (optional):** run the DSO 484 protocol through the model and compare the predicted shift with the
   reported delays. Report as a sanity check, not a fit.
All results are labeled as model outputs, not clinical outcomes.

## 7. Team and tracks
| Track | Owner | Delivers |
|---|---|---|
| ORBITAL app + model | Nora | suggestion engine, personal offset, shift planner in `model.mjs` / `app.mjs` |
| Data | Maria | Actiwatch file loader format, UTMB/DSO 484 tidy files, SSLA lux in config |
| Check-in + feedback + results | builder 3 | check-in UI, browser storage, results scripts and charts |
| Design + deploy | man-in-finance-65 | screens, GitHub Pages |
| Pitch + submission | AliveDragon | story around one astronaut, slides, demo video, project page |

## 8. Workflow
- **Everything lives in this repo:** app in `ORBITAL/`, plan in `docs/`, raw data in `data/`. Pages deploys
  `ORBITAL/dist` from main once Pages is enabled in this repo's settings (Source: GitHub Actions).
- Branch per feature, small PRs, one teammate review, merge often. Pages redeploys on every merge to main.
- Checkpoints (EST, Nov 15): suggested schedule working; real Actiwatch replay loads; check-in saved; results
  numbers in; demo video recorded; submit.

## 9. Gaps to watch
- The mission sets the sleep slot; ORBITAL suggests inside it and flags requests to planners, it does not override.
- Crew-quarters light is personal; shared modules stay on the station schedule.
- Actiwatch light sensors get covered by sleeves; mark nights with gaps instead of guessing.
- Model error: wearable-based DLMO estimates are about 1 h off in published studies. Say it.
- Insomnia files (CLIENT) are not astronauts; use the healthy partners for results.
- Numbers to verify before slides: "75% of ISS crew", "45% sleep medications", the 2 h DLMO-to-sleep gap.

## 10. Next steps
1. Agree on the pivot and this plan as a team.
2. Update `DATA_FLOW.md` and `SYSTEM_DESIGN.md` to the ORBITAL scope (both still describe the broad copilot).
3. Clean the data folder: keep the Actiwatch CSVs and `light.txt` with a source note; drop the MATLAB study bundle.
4. Turn each "Building" item into a GitHub Issue in this repo.

## 11. Verification
- ORBITAL runs locally and on Pages after each merge.
- A suggested schedule moves night-3 DLMO closer to aligned than the current light pattern.
- One real Actiwatch file replays without errors.
- Results scripts reproduce the same numbers twice.
