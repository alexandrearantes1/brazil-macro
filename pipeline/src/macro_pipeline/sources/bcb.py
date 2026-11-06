"""Banco Central do Brasil - SGS API."""
from datetime import date
import pandas as pd
from .http import get_json

BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{id}/dados"
MAX_WINDOW_YEARS = 10   # SGS limits daily-series queries to a 10-year window


def parse_sgs(rows: list[dict]) -> pd.DataFrame:
    """SGS returns [{'data': 'dd/mm/yyyy', 'valor': '12.34'}, ...] (strings)."""
    if not rows:
        return pd.DataFrame(columns=["date", "value"])
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["data"], format="%d/%m/%Y")
    df["value"] = pd.to_numeric(df["valor"], errors="coerce")
    return df[["date", "value"]].dropna().sort_values("date").reset_index(drop=True)


def fetch_bcb_sgs(series_id: int, start_year: int = 2010, session=None) -> pd.DataFrame:
    """Fetch a series from start_year to today, in <=10-year windows."""
    today = date.today()
    frames = []
    year = start_year
    while year <= today.year:
        end_year = min(year + MAX_WINDOW_YEARS - 1, today.year)
        params = {
            "formato": "json",
            "dataInicial": f"01/01/{year}",
            "dataFinal": today.strftime("%d/%m/%Y") if end_year == today.year
                         else f"31/12/{end_year}",
        }
        rows = get_json(BASE.format(id=series_id), params=params, session=session)
        frames.append(parse_sgs(rows))
        year = end_year + 1
    df = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame(columns=["date", "value"])
    return df.drop_duplicates("date").sort_values("date").reset_index(drop=True)
