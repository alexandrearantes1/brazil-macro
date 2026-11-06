import json
from pathlib import Path
import pandas as pd
from macro_pipeline import transform, writer
from macro_pipeline.models import Indicator
from macro_pipeline.sources.bcb import parse_sgs
from macro_pipeline.sources.http import TIMEOUT, make_session
from macro_pipeline.sources.ibge import parse_agregados

FIX = Path(__file__).parent / "fixtures"


def test_parse_sgs_converts_strings():
    df = parse_sgs(json.loads((FIX / "bcb_selic_sample.json").read_text()))
    assert df["value"].dtype.kind == "f" and df["date"].is_monotonic_increasing
    assert len(df) == 7


def test_irregular_collapses_unchanged_days():
    df = parse_sgs(json.loads((FIX / "bcb_selic_sample.json").read_text()))
    out = transform.clean(df, "irregular")
    assert list(out["value"]) == [10.75, 10.5, 10.5]   # change points + last obs
    assert out.iloc[-1]["date"] == pd.Timestamp("2024-05-03")


def test_parse_ibge_skips_missing_and_maps_dates():
    df = parse_agregados(json.loads((FIX / "ibge_unemployment_sample.json").read_text()))
    assert len(df) == 3 and df.iloc[0]["date"] == pd.Timestamp("2024-01-01")


def test_ibge_quarter_format():
    payload = [{"resultados": [{"series": [{"serie": {"202402": "0.5"}}]}]}]
    df = parse_agregados(payload, "quarter")
    assert df.iloc[0]["date"] == pd.Timestamp("2024-04-01")


def test_latest_change_and_yoy():
    df = pd.DataFrame({"date": pd.to_datetime(["2023-03-01", "2024-02-01", "2024-03-01"]),
                       "value": [100.0, 105.0, 110.0]})
    latest = transform.compute_latest(df)
    assert latest.change == 5.0 and round(latest.yoy, 1) == 10.0


def test_writer_roundtrip(tmp_path):
    df = pd.DataFrame({"date": pd.to_datetime(["2024-01-01", "2024-02-01"]), "value": [1.0, 2.0]})
    ind = Indicator("x", {"en": "X", "pt": "X"}, "%", "monthly", "test", "now",
                    transform.compute_latest(df), transform.to_observations(df))
    p = writer.write_indicator(ind, tmp_path)
    data = json.loads(p.read_text())
    assert data["latest"]["value"] == 2.0 and len(data["series"]) == 2


def test_http_session_retries_connect_and_read_errors():
    assert TIMEOUT >= 60
    session = make_session()
    retry = session.adapters["https://"].max_retries
    assert retry.total >= 5
    assert retry.connect == 5
    assert retry.read == 5
    assert retry.status == 5
