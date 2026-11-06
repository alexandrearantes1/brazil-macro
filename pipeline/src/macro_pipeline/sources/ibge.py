"""IBGE - Agregados API (SIDRA tables). FIRST VERSION: verify against real responses."""
import pandas as pd
from .http import get_json

BASE = "https://servicodados.ibge.gov.br/api/v3/agregados/{table}/periodos/-{periods}/variaveis/{variable}"


def parse_agregados(payload: list[dict], period_format: str = "month") -> pd.DataFrame:
    """payload[0]['resultados'][0]['series'][0]['serie'] -> {'202403': '7.9', ...}

    period_format:
      'month'   -> YYYYMM is a calendar month (PNAD moving quarters, labelled by last month)
      'quarter' -> YYYYQQ where QQ is 01..04 (national accounts)
    """
    serie = payload[0]["resultados"][0]["series"][0]["serie"]
    rows = []
    for period, raw in serie.items():
        try:
            value = float(raw)
        except (TypeError, ValueError):
            continue  # IBGE uses '-', '...', 'X' for missing
        year, num = int(period[:4]), int(period[4:])
        month = (num - 1) * 3 + 1 if period_format == "quarter" else num
        rows.append({"date": pd.Timestamp(year=year, month=month, day=1), "value": value})
    return pd.DataFrame(rows, columns=["date", "value"]).sort_values("date").reset_index(drop=True)


def fetch_ibge(table: int, variable: int, periods: int = 120, classification: str | None = None,
               period_format: str = "month", session=None) -> pd.DataFrame:
    params = {"localidades": "N1[all]"}
    if classification:
        params["classificacao"] = classification
    payload = get_json(BASE.format(table=table, periods=periods, variable=variable),
                       params=params, session=session)
    return parse_agregados(payload, period_format)
