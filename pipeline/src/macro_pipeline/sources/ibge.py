"""IBGE - Agregados API (SIDRA tables)."""
import pandas as pd
from .http import get_json

BASE = "https://apisidra.ibge.gov.br/values/t/{table}/n1/all/v/{variable}/p/last%20{periods}"


def parse_agregados(payload: list[dict], period_format: str = "month") -> pd.DataFrame:
    """payload[0]['resultados'][0]['series'][0]['serie'] -> {'202403': '7.9', ...}

    period_format:
      'month'   -> YYYYMM is a calendar month (PNAD moving quarters, labelled by last month)
      'quarter' -> YYYYQQ where QQ is 01..04 (national accounts)
            'year'    -> YYYY is an annual observation
    """
    if not payload:
        return pd.DataFrame(columns=["date", "value"])

    if "resultados" in payload[0]:
        observations = payload[0]["resultados"][0]["series"][0]["serie"].items()
    else:
        period_key = next(
            key for key, label in payload[0].items()
            if "Trimestre" in label or "Mês" in label or "Ano" in label
        )
        observations = ((row[period_key], row.get("V")) for row in payload[1:])

    rows = []
    for period, raw in observations:
        try:
            value = float(raw)
        except (TypeError, ValueError):
            continue  # IBGE uses '-', '...', 'X' for missing
        year = int(period[:4])
        if period_format == "year":
            month = 1
        else:
            num = int(period[4:])
            month = (num - 1) * 3 + 1 if period_format == "quarter" else num
        rows.append({"date": pd.Timestamp(year=year, month=month, day=1), "value": value})
    return pd.DataFrame(rows, columns=["date", "value"]).sort_values("date").reset_index(drop=True)


def fetch_ibge(table: int, variable: int, periods: int = 120, classification: str | None = None,
               period_format: str = "month", session=None) -> pd.DataFrame:
    url = BASE.format(table=table, periods=periods, variable=variable)
    if classification:
        classification_id, _, classification_value = classification.partition("[")
        url += f"/c{classification_id}/{classification_value.rstrip(']')}"
    payload = get_json(url, session=session)
    return parse_agregados(payload, period_format)
