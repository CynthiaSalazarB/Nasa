# Plan: NASA Space Apps 2026, team "NASA Gals +1", circadian copilot

## Context
Challenge: "Create Health Monitoring Software for Astronauts on Space Missions". Team of 5. The Google doc
"Preliminary Research" has research, datasets and tasks, but no scope, interface decision, data contract, architecture,
quantitative results or roles. Repo https://github.com/CynthiaSalazarB/Nasa (README only; collaborators so far:
CynthiaSalazarB, mariakahale, AliveDragon). Target: complete plan in the repo by 18:00 EST Nov 14, build tonight,
everything done Nov 15 morning. Judged on Impact, Creativity, Validity, Relevance (NASA data integral), Presentation.

## 1. One-line product
A crew tablet app that estimates each astronaut's body clock from the wearable they already wear, and turns it into
2 to 4 small actions a day (light, nap, caffeine cut-off, movement, sleep window), placed inside the crew timeline,
then learns which actions work for that person.

## 2. Interface: where the astronaut actually sees and answers it (researched)
Astronauts do not carry phones on ISS. They do use **tablets/iPads and laptops**: crew procedures, the Cognition
battery and the Reaction Self Test run on them; Artemis Orion flew an iPad crew display (Callisto); Crew Dragon uses
tablets. NASA Ames' **Playbook** (flew on ISS 2015+) is a tablet timeline app where crews edit their own schedule,
works offline and syncs later. Voice assistants were tested: **CIMON** (ISS 2018 to 2020, ran through a ground cloud,
couple-second replies) and **Callisto/Alexa** on Artemis I (local voice on a single-board computer; ~10 s round trip
flagged as a problem). Crew time is the scarcest resource (planned work ~6.5 h/day), and NASA already designs
measures to cut participant burden.

**Decision: web app = the crew tablet app** (responsive web runs on an iPad, so the web approach is right, just not a phone app).
Nudges reach the astronaut through 3 channels, quietest first:
1. **The light itself (no notification):** the app sets the crew-quarters SSLA mode (Pre-sleep 2700K, Alertness 6500K,
   General 4500K) on schedule, with the astronaut's consent. The best nudge needs no attention.
2. **Timeline items:** suggestions appear as blocks in the day's timeline ("21:30 wind-down light", "13:10 nap 20 min"),
   like Playbook, never as pop-ups during tasks.
3. **Voice, opt-in only:** spoken nudge at safe moments (browser speech for the demo). Muted by default during
   sleep window and critical tasks. Text always shown too. Pitch: runs locally on board, no ground round trip.

**Feedback without extra crew time:** it rides on check-ins NASA already runs (post-sleep sleep log, pre-sleep survey).
1 tap (better / same / worse) + optional reason (text or voice) + the 3-min reaction test when it is already scheduled.
Passive data (sleep, light, activity) carries most of the learning, so feedback can be sparse.
Target: **2 minutes or less of crew interaction per day** (quantified in results).

## 3. Scope

### Building (the demo)
- Tablet web app, 4 screens: **Today** (body clock + alertness curve over the timeline, status colors),
  **Nudge** (action + why + accept/snooze), **Check-in** (feedback + reaction test), **What works for you** (learning + trends).
- Escalation banner: "talk to the flight surgeon" when NASA thresholds trip.
- Simulated crew-quarters light panel that changes with the SSLA mode.
- Offline-first behaviour described; the demo runs locally.
- **In-silico experiment** producing the quantitative results (section 6).

### Not building, but it supports the pitch (say so on the slides)
- Training a population model on NASA's Standard Measures archive (needs data request + review board). Our design
  keeps the same interface so a trained model can replace the personal-fit layer.
- Real Actiwatch / Bio-Monitor integration (we read files in the Actiwatch's data shape).
- Real SSLA control (we simulate the panel).
- Local on-board LLM (we use Gemini via one swappable interface).
- Ground view for flight surgeons and planners (one mock screen at most).
- Moon/Mars days (24.65 h sol): the model accepts any light schedule; one slide, no feature.
- Earth uses: night-shift, Arctic, hospitals (pitch only).

### Out of scope (and why)
Sleep stages/REM (needs PSG), sex differences (no usable data this weekend), in-flight hormones (lab only),
medication advice (flight surgeon only, never the app), food as treatment (rationed menus, weak evidence), radiation.

## 4. What we track and what we compute

| Signal | Source in demo | Used for |
|---|---|---|
| Sleep episodes (start, end) | synthetic, Actiwatch shape | Process S, sleep debt, alignment |
| Light exposure (lux per min) | synthetic from ISS light levels + SSLA modes | circadian model input |
| Activity counts | synthetic / MMASH | circadian model input (activity predicts phase about as well as light) |
| Reaction test (mean RT ms, lapses) | synthetic, calibrated to Jones 2022 / Xiang 2024 | alertness check, learning reward |
| Sleepiness KSS 1-9, mood 1-5 | check-in | context, reward |
| Feedback (action, rating, reason) | check-in | learning |
| Caffeine time, exercise time | check-in / timeline | engine inputs |
| Mission timeline (task, start, end, critical) | synthetic ISS day (GMT, 8.5 h sleep slot) | constraints, scoring |
| Cabin CO2, temp, humidity | **OSDR Environmental Data App (real NASA)** | context flags that hurt sleep (NASA sleep DAG lists environment) |
| Baseline: chronotype (MEQ), sleep pattern, saliva melatonin/cortisol | **MMASH** (22 people) | starting personal profile |

Not tracked: heart rate/HRV (in MMASH and Bio-Monitor, but it adds nothing to the circadian calc; mention only), REM, core temp.

**How the health and the circadian rhythm are calculated**
1. **Circadian phase:** `arcascope/circadian` (MIT, `pip install circadian`), Forger99 or Hannay19 driven by light/activity,
   outputs DLMO; CBTmin taken as DLMO + ~7 h. Published accuracy of this model family from wearables: DLMO
   SD ~1.1 h, concordance 0.70 in night-shift workers (Cheng 2020), MAE ~31 min (Hannay, children). We inherit that error.
2. **Sleep pressure:** Process S (Borbely), tau rise 18.2 h, tau decay 4.2 h. The library has a combined
   sleep + circadian example (Skeldon 2023) to reuse.
3. **Alertness:** two-process combination (C minus S), mapped to predicted reaction-test lapses with a linear calibration.
4. **Personal fit:** 2 parameters per astronaut (intrinsic period / phase offset, sleep need), set from baseline,
   updated each night by least squares on observed sleep timing and reaction tests.
5. **Status colors:** sleep debt vs personal need; misaligned sleep (Flynn-Evans 2016 definition, check the paper);
   NASA thresholds: <6 h sleep 3+ nights, >16 h awake, reaction-test drop.
6. **Engine:** candidate actions simulated forward through the model; score = predicted alertness in the next critical
   window minus phase-disruption penalty; guardrails remove anything that breaks the timeline, ends a nap
   <30 min before a critical task (sleep inertia is in NASA's DAG), or touches meds/food.
7. **Learning:** Thompson sampling per action type per astronaut (reward = feedback + reaction-test change),
   multiplied into the engine score. This is the "gets better with you" part.
8. **LLM (Gemini):** only writes the nudge text and turns the free-text reason into tags. Never decides.

## 5. Architecture
- **Frontend:** Stitch designs; built as Vite + React (or Stitch HTML export + small JS).
- **Backend:** Python FastAPI: `data/` (loaders into the contract), `model/`, `engine/`, `learn/`, `llm/`, SQLite file
  (shortcut: single crew, upgrade for multi-crew).
- **API:** `GET /state`, `GET /forecast`, `GET /nudges`, `POST /checkin`, `POST /pvt`, `GET /insights`, `POST /light`.
- **`sim/`:** experiment runner that reuses `model/`, `engine/`, `learn/` and writes `results/*.csv` + charts.
- **Mock first:** `data/fixtures/*.json` match the contract on day 1 so frontend, model and data never wait on each other.

## 6. Quantitative results (in-silico, labeled as model outputs, not clinical outcomes)
Setup: 22 synthetic astronauts, one per MMASH baseline profile; 14-day ISS schedule; 8 h "slam shift" for a docking on
day 9; ISS-like light levels. Three policies:
A. station schedule, general lighting; B. NASA dynamic lighting, same for everyone; C. our personal copilot.
Metrics:
- % of sleep episodes misaligned (anchor: Flynn-Evans 2016 real crews)
- predicted reaction-test lapses during critical tasks
- days to re-align after the docking shift
- hours/day of predicted impairment
- crew interaction minutes/day and nudges/day (burden)
- learning: correct action found after N check-ins, cumulative regret vs fixed and random policies
  (simulated astronauts with hidden preferences, e.g. light works better than naps for some)
Output: 3 charts + 1 table for the slides and `docs/RESULTS.md`.

## 7. Team and tracks
| Track | Owner | Delivers |
|---|---|---|
| Pitch + story + submission | AliveDragon | script around "Sarah", slides, demo video, project page, citation check |
| Design + screens | teammate in finance | Stitch designs for the 4 screens + light panel |
| Data + simulation | one of the 3 | synthetic crew generator, MMASH baseline, OSDR download, `sim/` + results |
| Model + engine | one of the 3 | circadian + alertness, personal fit, scoring, guardrails, escalation |
| API + learning + LLM + frontend wiring | one of the 3 | FastAPI, Thompson sampling, Gemini wrapper, connect screens |

## 8. Workflow
- Branch per track, each track owns its folder, small PRs, one teammate review, merge often.
- Contract changes only via a PR touching `docs/SYSTEM_DESIGN.md` (contract section) + fixtures.
- One GitHub Issue per task, label = track.
- Checkpoints EST: 18:00 kickoff on fixtures; 21:00 model makes a forecast, screens render fixtures;
  ~00:00 end to end on one synthetic astronaut; Nov 15 morning: experiment results, learning screen, video, submit.

## 9. Gaps the doc and the idea were missing
- Shared crew, shared schedule: the app optimizes **inside** the ground-set timeline; schedule changes become requests
  to planners, not orders.
- Personal light only works in crew quarters; shared modules stay on the station schedule.
- Wear compliance: sleeves cover the light sensor; activity-based phase is the fallback.
- Feedback fatigue and "can-do" bias: rely on passive data + reaction test, not ratings.
- Monitoring distrust: astronaut owns the data, opt-in, and the pitch says who sees what.
- Validation: no real crew data this weekend, so results are in-silico and say so; model error ~1 h is stated.
- Relevance risk: core inputs are Earth + synthetic data. Make NASA data visible: OSDR cabin data, NASA sleep DAG as
  the engine's structure, SSLA spec, RST thresholds, Barger/Flynn-Evans/Jones numbers to calibrate.
- Doc numbers to verify before slides: "75% of ISS crew", "45% sleep medications".
- Doc task list misses: feedback loop, guardrails/escalation, synthetic generator, experiment + metrics,
  submission items, frontend coder, integration owner. "Get the LLM that calculates circadian rhythm" becomes "use
  arcascope/circadian". Device = Actiwatch Spectrum (already worn), no Apple Watch.
- The doc's GitHub link points to a discussion thread; replace with the repo URL.

## 10. Next steps
1. Review this plan on branch `docs/plan`, then merge by PR.
2. Write in the repo: `docs/PLAN.md` (sections 1 to 3, 7 to 9), `docs/SYSTEM_DESIGN.md`
   (sections 4 to 5, mermaid diagram, data contract, API), `docs/DATASETS.md` (sources, licenses, use, status),
   `docs/RESULTS.md` (section 6 design; numbers filled later), `DECISIONS.md` (hybrid model; tablet + light-first
   interface; Gemini now, local model in pitch), `data/fixtures/*.json`, updated `README.md` with run steps.
3. Spike: `pip install circadian`, run Forger99 + the Skeldon example on a synthetic ISS light schedule; confirm DLMO output.
4. If time: FastAPI skeleton serving fixtures, folder layout for `backend/`, `sim/`, `frontend/`.
5. Turn each task into a GitHub Issue labeled by track.

## 11. Verification
- Docs render on GitHub, mermaid diagram shows.
- Fixture check script (asserts) passes against the contract.
- Circadian spike prints a DLMO for one synthetic astronaut.
- If skeleton: `uvicorn` starts and `curl /nudges` returns fixture nudges.
