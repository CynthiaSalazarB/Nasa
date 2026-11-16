# Data

## `light.txt`
Approximate brightness of the ISS crew-quarters LED light settings, converted from candela to lux at mid-module.
Source: NASA Technical Reports Server, [20160005080](https://ntrs.nasa.gov/api/citations/20160005080/downloads/20160005080.pdf).
The pre-sleep default (about 105 lux) is an estimate, not read from the report's chart.
The app uses the Alertness / phase-shift value (about 500 lux) for morning light.

## `actigraphy-angelova-2021/`
Real wrist actigraphy (Actiwatch Spectrum, 1-minute epochs: activity, white light in lux, sleep/wake) for about
7 nights per person.

- `partner/`: 41 recordings from healthy bed partners
- `client/`: 45 recordings from people with chronic insomnia

Not connected to the app yet. They are kept so the personal fit can later be tested on real recordings.

Source: Angelova, M., Kusmakar, S., Karmakar, C., Zhu, Y., Shelyag, S., Drummond, S., & Ellis, J. (2021).
*Chronic insomnia and bed partner actigraphy data* [Dataset]. Dryad. https://doi.org/10.5061/dryad.b8gtht7bh.
Redistribution and use are permitted with acknowledgment. Only the CSV recordings are kept here; the study's
MATLAB analysis code and figures are in the original dataset.
