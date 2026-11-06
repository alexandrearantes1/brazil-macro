"""Paths and registry loading."""
from pathlib import Path
import yaml

PIPELINE_DIR = Path(__file__).resolve().parents[2]
ROOT_DIR = PIPELINE_DIR.parent
DATA_DIR = ROOT_DIR / "data"
INDICATORS_DIR = DATA_DIR / "indicators"
REGISTRY_PATH = PIPELINE_DIR / "indicators.yaml"


def load_registry(path: Path = REGISTRY_PATH) -> dict[str, dict]:
    with open(path, encoding="utf-8") as f:
        registry = yaml.safe_load(f)
    for key, cfg in registry.items():
        cfg["id"] = key
    return registry
