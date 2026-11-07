# brazil-macro

Dashboard of Brazilian macro indicators, grouped by government cycle.

## Layout

- `pipeline/` Python pipeline: fetches indicators and writes JSON.
- `data/` Output JSON (the contract between pipeline and site).
- `site/` Static one-page visualization dashboard.

## Run

```bash
cd pipeline
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
python -m macro_pipeline.main                 # all indicators
python -m macro_pipeline.main selic ipca      # only some
pytest
```

## View the dashboard

From the repository root, run `python3 -m http.server 8000` and open
http://localhost:8000/site/.

The live GitHub Pages site is https://alexandrearantes1.github.io/brazil-macro/.
GitHub Actions deploys on pushes to `main` and refreshes indicator data every
Monday at 12:17 UTC. The workflow can also be started manually from the Actions
tab.

## Adding an indicator

Add an entry to `pipeline/indicators.yaml`. No code needed for BCB SGS or IBGE series.

**Verify every `series_id` / table / variable against the BCB SGS catalog and the
SIDRA table pages.** A wrong ID silently returns a different series.
