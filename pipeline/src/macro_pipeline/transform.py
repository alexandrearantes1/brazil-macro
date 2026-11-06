"""Cleaning and derived values."""
import pandas as pd
from .models import Observation, Latest


def clean(df: pd.DataFrame, frequency: str) -> pd.DataFrame:
    df = df.dropna().drop_duplicates("date").sort_values("date").reset_index(drop=True)
    if frequency == "irregular" and len(df):
        # keep only rows where the value changed, plus the last observation
        changed = df["value"].ne(df["value"].shift())
        changed.iloc[-1] = True
        df = df[changed].reset_index(drop=True)
    return df


def compute_latest(df: pd.DataFrame) -> Latest:
    if df.empty:
        raise ValueError("empty series")
    last = df.iloc[-1]
    change = float(last["value"] - df.iloc[-2]["value"]) if len(df) > 1 else None
    # YoY: nearest observation at or before date - 365 days (within 45 days tolerance)
    target = last["date"] - pd.Timedelta(days=365)
    prior = df[df["date"] <= target]
    yoy = None
    if len(prior):
        p = prior.iloc[-1]
        if (target - p["date"]).days <= 45 and p["value"] != 0:
            yoy = float((last["value"] / p["value"] - 1) * 100)
    return Latest(date=last["date"].strftime("%Y-%m-%d"), value=float(last["value"]),
                  change=change, yoy=yoy)


def to_observations(df: pd.DataFrame) -> list[Observation]:
    return [Observation(date=d.strftime("%Y-%m-%d"), value=float(v))
            for d, v in zip(df["date"], df["value"])]
