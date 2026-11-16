# AstroWatch app

The AstroWatch dashboard. The folder keeps the prototype's original name, ORBITAL. Project overview, data sources and
license are in the [main README](../README.md).

## Run

```bash
python serve.py
```

Open http://localhost:8000. No install or build step. `serve.py` sends `.mjs` files as JavaScript (plain
`python -m http.server` sends them as text on some Windows setups, and the page stays blank) and disables caching.

## Files in `dist/`

| File | Role |
|---|---|
| `index.html`, `style.css` | The dashboard and the Research data page |
| `app.mjs` | Loads the crew, wires the screen, renders the record, forecast and recommendation |
| `model.mjs` | Forger99 body-clock model (browser port of `arcascope/circadian`, RK4, 5-minute steps); melatonin onset = core temperature low point minus 7 h |
| `fit.mjs` | Personal fit: start offset (-3 h to +3 h) and natural day length (23.8 to 24.6 h) from the last 21 nights; each night's error capped at 2 h |
| `suggest.mjs` | Searches 108 plans (sleep window, pre-sleep light start, morning light) and scores each at night 14 |
| `crew.mjs` | Eight fictional astronauts with 90 days of seeded sleep and light data |
| `charts.mjs` | Canvas charts: daily record, six-month view, research chart |
| `data/` | NASA research data shown on the Research page (UTMB bed rest, DSO 484) |
| `LICENSE-arcascope.txt` | Original MIT license of the ported model code |

## Research data sources

- **UTMB actigraphy:** [NASA Life Sciences Portal](https://nlsp.nasa.gov/search/data/details/e26501eb-7d7a-5012-8c8e-c5bdb3eecaf6?dataType=DATASETS), the 69 observations labeled C1G0001; durations converted to minutes.
- **DSO 484:** [NASA Life Sciences Portal](https://nlsp.nasa.gov/search/data/details/1bb44ffb-b00d-521a-bbeb-d8fcd036ad83?dataType=EXPERIMENTS); seven misplaced decimal points corrected against [Whitson et al., Table 1](https://zenodo.org/records/1230710/files/article.pdf). The page shows urinary melatonin sulfate, the marker complete for all eight subjects.
- **ISS lighting:** [NASA crew-quarters guidance](https://ntrs.nasa.gov/api/citations/20200011570/downloads/20200011570.pdf) for the light modes and the two-hour pre-sleep default.
