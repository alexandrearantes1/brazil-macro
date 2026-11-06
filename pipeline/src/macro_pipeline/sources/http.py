"""Shared HTTP session with retries and a timeout."""
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

TIMEOUT = 60


def make_session() -> requests.Session:
    s = requests.Session()
    retry = Retry(
        total=5,
        connect=5,
        read=5,
        status=5,
        other=5,
        backoff_factor=2,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
        raise_on_status=False,
        respect_retry_after_header=True,
    )
    s.mount("https://", HTTPAdapter(max_retries=retry))
    s.mount("http://", HTTPAdapter(max_retries=retry))
    s.headers["User-Agent"] = "brazil-macro/0.1 (+github)"
    return s


def get_json(url: str, params: dict | None = None, session: requests.Session | None = None,
             timeout: int = TIMEOUT):
    session = session or make_session()
    r = session.get(url, params=params, timeout=timeout)
    r.raise_for_status()
    return r.json()
