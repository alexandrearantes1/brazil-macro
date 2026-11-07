# Macro dashboard

This folder contains the static dashboard for comparing Brazilian macro indicators by government cycle. Indicators are grouped into monetary policy, output and household income, public finances, and the external position.

## How to run

From the repository root (the dashboard reads JSON from `data/`):

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/site/.

## Data model

The dashboard reads the generated JSON files from `data/indicators/` and groups each series into presidential four-year terms.

## What the dashboard shows

- every configured indicator on one page, separated by color-coded category bands
- a timeline or small-multiple cycle view for each series
- government comparisons using the selected average, end-of-term, or change metric
- event labels when the selected series has a local outlier near the 2008 financial crisis or COVID-19

Historical coverage begins with each source's first available observation; it is not uniform across indicators.
