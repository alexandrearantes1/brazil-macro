"""Output schema: what gets written to data/indicators/<id>.json."""
from dataclasses import dataclass, asdict


@dataclass
class Observation:
    date: str          # ISO date, YYYY-MM-DD
    value: float


@dataclass
class Latest:
    date: str
    value: float
    change: float | None   # absolute change vs previous observation
    yoy: float | None      # percent change vs ~12 months earlier (None if n/a)


@dataclass
class Indicator:
    id: str
    name: dict
    unit: str
    frequency: str
    source: str
    last_updated: str
    latest: Latest
    series: list[Observation]

    def to_dict(self) -> dict:
        return asdict(self)
