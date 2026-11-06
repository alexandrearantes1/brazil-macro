# CLAUDE project context

This file stores the project decisions and operational context so future sessions can resume without re-discovering the same facts.

## Project overview

- Repo name: brazil-macro
- Objective: fetch Brazilian macro indicators and publish JSON output for a dashboard.
- Main code lives under `pipeline/`.
- Output data is stored under `data/indicators/`.

## Operational commands

- Initialize / install dependencies:
  - `cd pipeline`
  - `python3 -m pip install -e '.[dev]'`
- Run full pipeline:
  - `cd pipeline && python3 -m macro_pipeline.main`
- Run tests:
  - `cd pipeline && pytest -q`

## Current decisions

- The app is intentionally resilient to partial upstream failures: a bad source should not block unrelated indicators.
- The HTTP layer is shared by all data sources and should centralize retry, timeout, and user-agent behavior.
- The pipeline should continue to write successful outputs even when a subset of sources fails.
- Requests to flaky external services should use a 60s timeout and retry on connection, read, and HTTP status failures before declaring a source failed.
- If an indicator fetch times out or errors, the CLI should print a clear failure message and continue processing the remaining indicators instead of aborting the full run.

## Known source behavior

- BCB SGS endpoints are generally stable and are the default path for `selic`, `ipca`, and `fx_reserves`.
- IBGE SIDRA calls can be slow or timeout intermittently.
- The HTTP session uses a 60s timeout and retries on connection, read, and status failures to reduce flaky upstream issues.
- IBGE-dependent indicators are treated as optional for the full pipeline run; a timeout there should not block successful BCB outputs from being written.

## Verification status

- As of 2026-11-06, the targeted regression tests for the shared HTTP behavior pass:
  - `cd pipeline && pytest -q tests/test_transform.py` -> `7 passed`
- The pipeline continues to generate successful outputs for the stable BCB indicators even when IBGE endpoints are unavailable or timing out.
- IBGE-dependent indicators may still fail if the remote service is slow or unreachable; those failures are logged and isolated rather than aborting the run.

## Important notes

- Verify all series IDs/tables/variables against the official BCB SGS and IBGE catalogs before trusting live output.
- The registry in `pipeline/indicators.yaml` is the canonical list of indicators.
- Do not assume external APIs are always available; treat them as flaky network dependencies.
