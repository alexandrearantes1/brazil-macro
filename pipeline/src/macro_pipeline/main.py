"""Entry point: python -m macro_pipeline.main [indicator_id ...]"""
import sys
from datetime import datetime, timezone

from . import config, transform, writer
from .models import Indicator
from .sources.bcb import fetch_bcb_sgs
from .sources.http import make_session
from .sources.ibge import fetch_ibge

SOURCE_LABELS = {"bcb_sgs": "Banco Central do Brasil (SGS {series_id})",
                 "ibge_sidra": "IBGE (SIDRA {table}/{variable})"}


def fetch(cfg: dict, session) -> "pd.DataFrame":
    if cfg["source"] == "bcb_sgs":
        return fetch_bcb_sgs(cfg["series_id"], cfg.get("start_year", 2010), session)
    if cfg["source"] == "ibge_sidra":
        return fetch_ibge(cfg["table"], cfg["variable"], cfg.get("periods", 120),
                          cfg.get("classification"), cfg.get("period_format", "month"), session)
    raise ValueError(f"unknown source {cfg['source']!r}")


def build(cfg: dict, session, now: str) -> Indicator:
    df = transform.clean(fetch(cfg, session), cfg["frequency"])
    return Indicator(
        id=cfg["id"], name=cfg["name"], unit=cfg["unit"], frequency=cfg["frequency"],
        source=SOURCE_LABELS[cfg["source"]].format(**cfg), last_updated=now,
        latest=transform.compute_latest(df), series=transform.to_observations(df),
    )


def main(argv: list[str]) -> int:
    registry = config.load_registry()
    wanted = argv or list(registry)
    unknown = [w for w in wanted if w not in registry]
    if unknown:
        print(f"Unknown indicators: {unknown}. Available: {list(registry)}")
        return 2

    session, now = make_session(), datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    done, failed = [], []
    for key in wanted:
        try:
            ind = build(registry[key], session, now)
            path = writer.write_indicator(ind, config.INDICATORS_DIR)
            done.append(ind)
            print(f"OK   {key:14s} latest={ind.latest.value} ({ind.latest.date}) -> {path.name}")
        except Exception as e:  # one bad source must not block the others
            failed.append(key)
            print(f"FAIL {key:14s} {type(e).__name__}: {e}")

    if done and not argv:   # only rewrite the index on a full run
        writer.write_index(done, config.DATA_DIR, now)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
