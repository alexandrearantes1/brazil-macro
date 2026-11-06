# brazil-macro

Dashboard of Brazilian macro indicators. This repo currently contains the data pipeline.

## Layout
- `pipeline/` Python pipeline: fetches indicators and writes JSON.
- `data/` Output JSON (the contract between pipeline and site).
- `site/` Frontend (later).

## Run
```bash
cd pipeline
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
python -m macro_pipeline.main                 # all indicators
python -m macro_pipeline.main selic ipca      # only some
pytest
```

## Adding an indicator
Add an entry to `pipeline/indicators.yaml`. No code needed for BCB SGS or IBGE series.

**Verify every `series_id` / table / variable against the BCB SGS catalog and the
SIDRA table pages.** A wrong ID silently returns a different series.
