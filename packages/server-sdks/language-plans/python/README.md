# `shipeasy` — Python SDK

One PyPI package. Supports Django, Flask, FastAPI, Celery, AWS Lambda, Google Cloud Functions, and plain Python. Covers both experimentation (flags, configs, experiments, events) and the string manager (i18n labels).

- Python ≥ 3.10
- Sync + async APIs (`init()` and `async_init()`)
- Module-level singleton — thread-safe, daemon background thread for long-running servers
- `init_once()` for per-request / serverless use

---

## Installation

```bash
pip install shipeasy
# or
poetry add shipeasy
# or (Django convenience extras)
pip install "shipeasy[django]"
```

Optional extras:

- `shipeasy[django]` — registers middleware + template tags
- `shipeasy[fastapi]` — lifespan helper
- `shipeasy[flask]` — app factory extension
- `shipeasy[pydantic]` — `get_config(name, PydanticModel)` overload

No extras = plain Python; none of the framework glue is imported.

---

## Quick start

### Django

```python
# settings.py
INSTALLED_APPS = [..., "shipeasy.django"]
MIDDLEWARE = [..., "shipeasy.django.middleware.ShipeasyMiddleware"]

SHIPEASY = {
    "api_key":  os.environ["SHIPEASY_SERVER_KEY"],
    "base_url": os.environ.get("SHIPEASY_BASE_URL", "https://api.shipeasy.ai"),
}

# views.py
def checkout(request):
    if request.shipeasy.get_flag("new_checkout", request.shipeasy_user):
        return new_checkout(request)
    result = request.shipeasy.get_experiment(
        "checkout_button_color",
        default_params={"color": "gray"},
        decode=lambda raw: {"color": raw.get("color", "gray") if isinstance(raw, dict) else "gray"},
    )
    request.shipeasy.track(str(request.user.id), "purchase_completed", value=order.total)

    greeting = request.shipeasy.t("user.greeting", {"name": request.user.first_name})
    return render(request, "checkout.html", {"color": result.params["color"], "greeting": greeting})
```

Template tag for i18n:

```django
{% load shipeasy %}
<h1>{% shipeasy_t "user.greeting" name=request.user.first_name %}</h1>
```

### FastAPI

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from shipeasy import Shipeasy

shipeasy_client = Shipeasy(api_key=os.environ["SHIPEASY_SERVER_KEY"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    await shipeasy_client.async_init()
    yield
    shipeasy_client.destroy()

app = FastAPI(lifespan=lifespan)

@app.get("/checkout")
async def checkout(request: Request):
    user = {"user_id": request.headers["x-user-id"]}
    if shipeasy_client.get_flag("new_checkout", user):
        ...
```

### Plain Python (script, Celery task, Lambda handler)

```python
from shipeasy import Shipeasy

flags = Shipeasy(api_key=os.environ["SHIPEASY_SERVER_KEY"])
flags.init_once()  # one-shot; no background thread

if flags.get_flag("email_digest", {"user_id": str(user.id)}):
    send_digest(user)
```

---

## Sub-entry-point map

| Import              | Purpose                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `shipeasy.Shipeasy` | Core client (sync + async). Covers both experimentation and i18n. |
| `shipeasy.django`   | Django app, middleware, template tags, management commands.       |
| `shipeasy.flask`    | Flask extension (`Shipeasy(app)` / `init_app(app)` factory).      |
| `shipeasy.fastapi`  | Lifespan helper + dependency `Depends(get_shipeasy)`.             |
| `shipeasy.asgi`     | Generic ASGI middleware for Starlette, Quart, Sanic.              |
| `shipeasy.wsgi`     | Generic WSGI middleware for Pyramid, Bottle, plain WSGI.          |
| `shipeasy.celery`   | Worker startup hook (`init()` on `worker_process_init`).          |
| `shipeasy.testing`  | Test fixtures (`pytest` plugin, in-memory mock client).           |

Every sub-module is lazy-imported — importing `shipeasy` does not pull Django in.

---

## Public API

### Client construction

```python
client = Shipeasy(
    api_key: str,                   # server key "sdk_server_…"
    base_url: str = "https://api.shipeasy.ai",
    poll_interval_s: float | None = None,     # overrides server's X-Poll-Interval
    http_timeout_s: float = 5.0,
    http_client: httpx.Client | None = None,  # inject your own for retries/telemetry
)
```

### Methods

```python
client.init()                 # starts daemon thread, blocks on first fetch
await client.async_init()     # asyncio variant
client.init_once()            # one fetch, no thread
client.destroy()              # stop thread

client.get_flag(name: str, user: dict) -> bool
client.get_config(name: str, decoder: Callable[[Any], T] | type[T]) -> T
client.get_experiment(
    name: str,
    default_params: dict,
    decode: Callable[[Any], T],
) -> ExperimentResult[T]
# ExperimentResult has .in_experiment (bool), .group (str), .params (T)

client.track(user_id: str, event_name: str, value: float | None = None, **props) -> None

# i18n
bundle = client.load_labels(profile: str, chunk: str | None = None) -> LabelBundle
greeting = bundle.t("user.greeting", {"name": "Alice"})
# Convenience: client.t(key, variables, profile=..., chunk=...)
```

### Pydantic overload (optional)

```python
from pydantic import BaseModel

class CheckoutCfg(BaseModel):
    timeout_ms: int
    retry: bool = False

cfg = client.get_config("checkout_config", CheckoutCfg)  # validates + returns typed model
```

---

## Source layout

```
packages/language_sdks/python/
  README.md                         ← this file
  pyproject.toml                    ← hatch or poetry build; PyPI name "shipeasy"
  src/shipeasy/
    __init__.py                     ← public API re-exports
    client.py                       ← Shipeasy class (sync + async thread mgmt)
    hash.py                         ← murmurhash3_x86_32 (pure Python + optional mmh3 fallback)
    eval/
      gate.py
      experiment.py
    transport/
      http.py                       ← httpx wrapper + ETag + retries
      events.py                     ← /collect fire-and-forget queue
    i18n/
      bundle.py                     ← LabelBundle, interpolation, fallback chain
      loader.py                     ← manifest fetch + chunk fetch
    django/
      __init__.py
      apps.py
      middleware.py
      templatetags/shipeasy.py
      management/commands/shipeasy_sync.py
    flask/__init__.py
    fastapi/__init__.py
    asgi.py
    wsgi.py
    celery.py
    testing/
      __init__.py
      mock.py
      fixtures.py                   ← pytest plugin
  tests/
    test_hash_vectors.py            ← 5 cross-language vectors
    test_eval_gate.py
    test_eval_experiment.py
    test_i18n.py
    test_django_integration.py
    test_fastapi_integration.py
```

Wheel build via `hatch` or `poetry`. Pure-Python so no platform-specific wheels required; `mmh3` is an optional C-accelerated fallback detected at import time.

---

## Non-negotiables

- All 5 MurmurHash3 test vectors pass (`test_hash_vectors.py`). Cross-language CI compares against the shared fixture.
- Background poll thread is `daemon=True` — never blocks process shutdown.
- Events to `/collect` are fire-and-forget — never block the request path; errors are logged at `DEBUG` and swallowed.
- `init_once()` is the default advice for Lambda / Cloud Functions; `init()` is for long-running WSGI/ASGI workers.
- Django middleware and FastAPI lifespan are the canonical integrations — both are covered by integration tests.
- Label interpolation matches the JS SDK's `{{var}}` syntax exactly so SSR pages rendered by Python and hydrated by TS stay byte-identical.
