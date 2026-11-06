"""Writes JSON files for the site."""
import json
from pathlib import Path
from .models import Indicator


def write_indicator(ind: Indicator, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{ind.id}.json"
    path.write_text(json.dumps(ind.to_dict(), ensure_ascii=False, indent=1), encoding="utf-8")
    return path


def write_index(indicators: list[Indicator], data_dir: Path, last_updated: str) -> Path:
    data_dir.mkdir(parents=True, exist_ok=True)
    index = {
        "last_updated": last_updated,
        "indicators": [
            {"id": i.id, "name": i.name, "unit": i.unit, "frequency": i.frequency,
             "latest": {"date": i.latest.date, "value": i.latest.value}}
            for i in indicators
        ],
    }
    path = data_dir / "index.json"
    path.write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    return path
