# Plan: ShipEasyI18n Django Integration

**Goal**: Provide a Django app (`i18n-django`) with template tags for injecting inline label data into HTML `<head>` and a server-side `i18n_t()` helper for translating strings in views and templates, with HTTP caching to avoid adding latency to every request.
**Package**: `i18n-django` (PyPI package)
**Key challenge**: Django's template engine uses Python-based template tags, not JavaScript. Labels must be fetched server-side via Python HTTP, cached in Django's cache framework, and injected as a JSON script tag. The package must integrate cleanly with Django's template tag registration system without requiring users to add the template library to every template.

---

## Install

```bash
pip install i18n-django
```

Add to `INSTALLED_APPS` in `settings.py`:

```python
INSTALLED_APPS = [
    # ...
    'i18n_django',
]
```

---

## Package Structure

```
i18n_django/
  __init__.py
  apps.py            ← AppConfig
  settings.py        ← get_i18n_settings() helper
  fetcher.py         ← HTTP client with Django cache integration
  templatetags/
    __init__.py
    i18n.py           ← {% i18n_inline_data %}, {% i18n_script_tag %}, {{ i18n_t }}
  views.py           ← optional: view mixin for pre-fetching labels
  middleware.py      ← optional: ShipEasyI18nMiddleware for attaching labels to request
```

---

## Settings

```python
# settings.py
ShipEasyI18n = {
    "PUBLIC_KEY": env("ShipEasyI18n_KEY"),           # or hardcode: "i18n_pk_abc123"
    "PROFILE": env("ShipEasyI18n_PROFILE", default="en:prod"),
    "DEFAULT_CHUNK": "index",
    "CDN_BASE_URL": "https://cdn.i18n.shipeasy.ai",
    "LOADER_URL": "https://cdn.i18n.shipeasy.ai/loader.js",
    "MANIFEST_CACHE_TTL": 60,              # seconds
    "LABEL_FILE_CACHE_TTL": 3600,          # seconds (immutable files)
    "HTTP_TIMEOUT": 1,                     # seconds
}
```

**Note**: `PUBLIC_KEY` is a public ShipEasyI18n key (safe to include in HTML). Store it in environment variables or Django's encrypted settings — never commit it as a literal string in source if you want to swap keys per environment.

---

## Full Source

### `i18n_django/apps.py`

```python
from django.apps import AppConfig

class ShipEasyI18nDjangoConfig(AppConfig):
    name = 'i18n_django'
    verbose_name = 'ShipEasyI18n Django'
    default_auto_field = 'django.db.models.BigAutoField'
```

### `i18n_django/settings.py`

```python
from django.conf import settings as django_settings

DEFAULTS = {
    "PUBLIC_KEY": "",
    "PROFILE": "en:prod",
    "DEFAULT_CHUNK": "index",
    "CDN_BASE_URL": "https://cdn.i18n.shipeasy.ai",
    "LOADER_URL": "https://cdn.i18n.shipeasy.ai/loader.js",
    "MANIFEST_CACHE_TTL": 60,
    "LABEL_FILE_CACHE_TTL": 3600,
    "HTTP_TIMEOUT": 1,
}

def get_i18n_settings():
    user_settings = getattr(django_settings, "ShipEasyI18n", {})
    return {**DEFAULTS, **user_settings}
```

### `i18n_django/fetcher.py`

```python
import hashlib
import json
import logging
import urllib.request
import urllib.error
from typing import Optional

from django.core.cache import cache

from .settings import get_i18n_settings

logger = logging.getLogger("i18n")


class ShipEasyI18nFetcher:
    """
    Fetches ShipEasyI18n label files from the CDN with Django cache integration.

    Manifest (manifest.json) is cached for MANIFEST_CACHE_TTL seconds (60s).
    Label files (immutable, content-addressed) are cached for LABEL_FILE_CACHE_TTL (1h).

    All failures are logged and return None — the template tag degrades gracefully.
    """

    def fetch(
        self,
        profile: Optional[str] = None,
        chunk: Optional[str] = None,
    ) -> Optional[dict]:
        cfg = get_i18n_settings()
        resolved_profile = profile or cfg["PROFILE"]
        resolved_chunk = chunk or cfg["DEFAULT_CHUNK"]

        manifest = self._fetch_manifest(cfg, resolved_profile)
        if not manifest:
            return None

        file_url = manifest.get(resolved_chunk)
        if not file_url:
            logger.warning(
                f"[ShipEasyI18n] Chunk '{resolved_chunk}' not found in manifest "
                f"for profile '{resolved_profile}'"
            )
            return None

        return self._fetch_label_file(cfg, file_url)

    def _fetch_manifest(self, cfg: dict, profile: str) -> Optional[dict]:
        cache_key = f"i18n:manifest:{cfg['PUBLIC_KEY']}:{profile}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        url = f"{cfg['CDN_BASE_URL']}/labels/{cfg['PUBLIC_KEY']}/{profile}/manifest.json"
        data = self._http_get(url, cfg["HTTP_TIMEOUT"])
        if data is not None:
            cache.set(cache_key, data, timeout=cfg["MANIFEST_CACHE_TTL"])
        return data

    def _fetch_label_file(self, cfg: dict, url: str) -> Optional[dict]:
        cache_key = f"i18n:label:{hashlib.md5(url.encode()).hexdigest()}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        data = self._http_get(url, cfg["HTTP_TIMEOUT"])
        if data is not None:
            cache.set(cache_key, data, timeout=cfg["LABEL_FILE_CACHE_TTL"])
        return data

    def _http_get(self, url: str, timeout: int) -> Optional[dict]:
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return json.loads(response.read())
        except urllib.error.HTTPError as e:
            logger.warning(f"[ShipEasyI18n] HTTP {e.code} fetching {url}")
        except urllib.error.URLError as e:
            logger.warning(f"[ShipEasyI18n] URL error fetching {url}: {e.reason}")
        except Exception as e:
            logger.warning(f"[ShipEasyI18n] Error fetching {url}: {e}")
        return None
```

### `i18n_django/templatetags/i18n.py`

```python
import json
from typing import Optional

from django import template
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from ..fetcher import ShipEasyI18nFetcher
from ..settings import get_i18n_settings

register = template.Library()

_fetcher = ShipEasyI18nFetcher()


# ── Template Tags ──────────────────────────────────────────────────────────────

@register.simple_tag
def i18n_inline_data(profile=None, chunk=None):
    """
    Renders <script id="i18n-data" type="application/json"> with label data.
    Place in <head> before loader.js.

    {% load i18n %}
    {% i18n_inline_data %}
    {% i18n_inline_data profile="fr:prod" chunk="checkout" %}
    """
    label_file = _fetcher.fetch(profile=profile, chunk=chunk)
    if not label_file:
        return ""

    # json.dumps escapes </script> as \u003C/script\u003E automatically
    json_content = json.dumps(label_file, ensure_ascii=False)
    return format_html(
        '<script id="i18n-data" type="application/json">{}</script>',
        mark_safe(json_content)  # safe: JSON is not executable HTML
    )


@register.simple_tag
def i18n_script_tag(hide_until_ready=False):
    """
    Renders <script src="https://cdn.i18n.shipeasy.ai/loader.js" ...>.

    {% i18n_script_tag %}
    {% i18n_script_tag hide_until_ready=True %}
    """
    cfg = get_i18n_settings()
    attrs = f'src="{cfg["LOADER_URL"]}" data-key="{cfg["PUBLIC_KEY"]}" data-profile="{cfg["PROFILE"]}" async'
    if hide_until_ready:
        attrs += ' data-hide-until-ready="true"'
    return mark_safe(f'<script {attrs}></script>')


@register.simple_tag
def i18n_head_tags(profile=None, chunk=None, hide_until_ready=False):
    """
    Renders both i18n_inline_data and i18n_script_tag in one call.

    {% i18n_head_tags %}
    """
    inline = i18n_inline_data(profile=profile, chunk=chunk)
    script = i18n_script_tag(hide_until_ready=hide_until_ready)
    return mark_safe(f"{inline}\n{script}")


# ── Template Filter ────────────────────────────────────────────────────────────

@register.simple_tag(takes_context=False)
def i18n_t(key, profile=None, chunk=None, **variables):
    """
    Server-side translation filter.

    {% load i18n %}
    {% i18n_t "nav.home" %}
    {% i18n_t "user.greeting" name=user.first_name %}

    Returns the key as fallback if labels are unavailable.
    """
    label_file = _fetcher.fetch(profile=profile, chunk=chunk)
    if not label_file or "strings" not in label_file:
        return key

    value = label_file["strings"].get(key, key)

    for k, v in variables.items():
        value = value.replace(f"{{{{{k}}}}}", str(v))

    return value


# ── Python API (for use in views.py, not templates) ───────────────────────────

def translate(key: str, variables: Optional[dict] = None, profile: str = None, chunk: str = None) -> str:
    """
    Programmatic translation for use in Python view code.

    from i18n_django import translate
    title = translate('page.dashboard.title')
    greeting = translate('user.greeting', {'name': request.user.first_name})
    """
    label_file = _fetcher.fetch(profile=profile, chunk=chunk)
    if not label_file or "strings" not in label_file:
        return key

    value = label_file["strings"].get(key, key)

    if variables:
        for k, v in variables.items():
            value = value.replace(f"{{{{{k}}}}}", str(v))

    return value
```

### `i18n_django/__init__.py`

```python
from .templatetags.i18n import translate

__all__ = ["translate"]
```

### `i18n_django/middleware.py`

```python
from .fetcher import ShipEasyI18nFetcher


class ShipEasyI18nMiddleware:
    """
    Optional middleware that pre-fetches ShipEasyI18n labels and attaches them to request.i18n.

    This ensures labels are fetched once per request (hitting cache) rather than
    once per template tag call.

    Add to MIDDLEWARE before your view middleware:
    MIDDLEWARE = [
        'i18n_django.middleware.ShipEasyI18nMiddleware',
        ...
    ]
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.fetcher = ShipEasyI18nFetcher()

    def __call__(self, request):
        label_file = self.fetcher.fetch()

        class ShipEasyI18nProxy:
            def t(self, key, **variables):
                if not label_file or "strings" not in label_file:
                    return key
                value = label_file["strings"].get(key, key)
                for k, v in variables.items():
                    value = value.replace(f"{{{{{k}}}}}", str(v))
                return value

            @property
            def labels(self):
                return label_file

        request.i18n = ShipEasyI18nProxy()
        return self.get_response(request)
```

---

## Template Usage

### Base template (`templates/base.html`)

```html
{% load i18n %}
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>{% i18n_t "page.title" %}</title>
    {% i18n_head_tags %} {% block head %}{% endblock %}
  </head>
  <body>
    {% block content %}{% endblock %}
  </body>
</html>
```

### Page template

```html
{% extends "base.html" %} {% load i18n %} {% block content %}
<h1 data-label="page.dashboard.title">{% i18n_t "page.dashboard.title" %}</h1>

<span data-label="user.greeting" data-variables='{"name": "{{ user.first_name }}"}'>
  {% i18n_t "user.greeting" name=user.first_name %}
</span>

<nav>
  <a href="/" data-label="nav.home">{% i18n_t "nav.home" %}</a>
</nav>

<input
  type="email"
  data-label="form.email.placeholder"
  data-label-attr="placeholder"
  placeholder="{% i18n_t 'form.email.placeholder' %}"
/>
{% endblock %}
```

### Per-page chunk override

```html
{% load i18n %} {% block head %} {# Preload the checkout chunk for this page #} {% i18n_inline_data
chunk="checkout" %} {% endblock %}
```

### View code (Python)

```python
# views.py
from django.shortcuts import render
from i18n_django import translate

def dashboard(request):
    title = translate('page.dashboard.title')
    greeting = translate('user.greeting', {'name': request.user.first_name})

    return render(request, 'dashboard.html', {
        'page_title': title,
        'greeting': greeting,
    })
```

### With middleware

```html
{% block content %} {# request.i18n available when ShipEasyI18nMiddleware is installed #}
<h1>{{ request.i18n.t "page.title" }}</h1>
{% endblock %}
```

```python
# views.py
def dashboard(request):
    title = request.i18n.t('page.dashboard.title')
    return render(request, 'dashboard.html', {'title': title})
```

---

## Django REST Framework Integration

For API endpoints that return translated strings:

```python
# serializers.py
from rest_framework import serializers
from i18n_django import translate

class ProductSerializer(serializers.ModelSerializer):
    label = serializers.SerializerMethodField()

    def get_label(self, obj):
        return translate(f'product.{obj.slug}.label')

    class Meta:
        model = Product
        fields = ['id', 'name', 'label']
```

---

## Caching Strategy

### Django cache backend

Configure `django.core.cache`:

```python
# settings.py for production
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("REDIS_URL"),
    }
}
```

For development or apps without Redis:

```python
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}
```

### Cache key format

```
i18n:manifest:{public_key}:{profile}    → manifest JSON, TTL 60s
i18n:label:{md5(file_url)}             → label file JSON, TTL 3600s
```

### Cache warming on startup

```python
# apps.py
class ShipEasyI18nDjangoConfig(AppConfig):
    name = 'i18n_django'

    def ready(self):
        # Pre-warm cache in production on startup
        import threading
        from .fetcher import ShipEasyI18nFetcher

        def warm():
            try:
                ShipEasyI18nFetcher().fetch()
            except Exception:
                pass

        if not self._is_dev_server_reload():
            threading.Thread(target=warm, daemon=True).start()

    def _is_dev_server_reload(self):
        import os
        return os.environ.get('RUN_MAIN') != 'true'
```

---

## Edge Cases

### Template tag loading

Users must add `{% load i18n %}` to every template that uses ShipEasyI18n tags. To make it automatic (like Django's built-in tags), add to `TEMPLATES` builtins:

```python
# settings.py
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'OPTIONS': {
            'builtins': [
                'i18n_django.templatetags.i18n',
            ],
        },
    },
]
```

With this, `{% i18n_head_tags %}` works without `{% load i18n %}` in every template.

### CSP Headers

```python
# settings.py (with django-csp)
CSP_SCRIPT_SRC = ("'self'", "https://cdn.i18n.shipeasy.ai")
CSP_CONNECT_SRC = ("'self'", "https://api.i18n.shipeasy.ai", "https://cdn.i18n.shipeasy.ai")
```

The inline `<script type="application/json">` does not require a CSP nonce — it is not executable JavaScript.

### `mark_safe` security

`json_content` passed to `mark_safe` in `i18n_inline_data` is safe because:

1. `json.dumps()` escapes `<`, `>`, `&` as Unicode escapes by default.
2. Label values are developer-controlled strings from the ShipEasyI18n CDN (not user input).
3. `type="application/json"` scripts are not parsed as JavaScript.

### Async views (Django async)

`ShipEasyI18nFetcher._http_get` uses `urllib.request.urlopen` which is synchronous. For async views, use `httpx` with `async with httpx.AsyncClient()`:

```python
# fetcher_async.py
import httpx

class AsyncShipEasyI18nFetcher:
    async def fetch(self, profile=None, chunk=None):
        cfg = get_i18n_settings()
        # ... same structure but with await httpx.AsyncClient().get(url)
```

For most Django apps, the synchronous fetcher is fine — label fetches hit Django's cache (nanoseconds) on all but the first request.

### Internationalization (per-request locale)

Detect locale from `request.LANGUAGE_CODE` or a cookie:

```python
# views.py
def my_view(request):
    locale = request.LANGUAGE_CODE.replace('-', '_')
    profile = f"{locale}:prod"
    title = translate('page.title', profile=profile)
    return render(request, 'page.html', {
        'title': title,
        'i18n_profile': profile,  # pass to template for i18n_inline_data
    })
```

```html
<!-- template.html -->
{% i18n_inline_data profile=i18n_profile %}
```

---

## Test Commands

```bash
python -m pytest i18n_django/tests/    # pytest
python -m pytest --cov=i18n_django     # with coverage
python manage.py test i18n_django       # Django test runner
```

### Unit Test

```python
# i18n_django/tests/test_templatetags.py
from django.test import TestCase, RequestFactory
from django.template import Context, Template
from unittest.mock import patch


class ShipEasyI18nTemplateTagsTest(TestCase):
    def _render(self, template_str, context=None):
        t = Template("{% load i18n %}" + template_str)
        return t.render(Context(context or {}))

    @patch('i18n_django.templatetags.i18n._fetcher')
    def test_i18n_t_returns_key_as_fallback(self, mock_fetcher):
        mock_fetcher.fetch.return_value = None
        result = self._render("{% i18n_t 'nav.home' %}")
        self.assertEqual(result.strip(), 'nav.home')

    @patch('i18n_django.templatetags.i18n._fetcher')
    def test_i18n_t_translates_key(self, mock_fetcher):
        mock_fetcher.fetch.return_value = {'strings': {'nav.home': 'Home'}}
        result = self._render("{% i18n_t 'nav.home' %}")
        self.assertEqual(result.strip(), 'Home')

    @patch('i18n_django.templatetags.i18n._fetcher')
    def test_i18n_t_interpolates_variables(self, mock_fetcher):
        mock_fetcher.fetch.return_value = {
            'strings': {'user.greeting': 'Hello, {{name}}!'}
        }
        result = self._render("{% i18n_t 'user.greeting' name='Alice' %}")
        self.assertEqual(result.strip(), 'Hello, Alice!')

    @patch('i18n_django.templatetags.i18n._fetcher')
    def test_i18n_inline_data_renders_script_tag(self, mock_fetcher):
        mock_fetcher.fetch.return_value = {
            'v': 1, 'strings': {'nav.home': 'Home'}
        }
        result = self._render("{% i18n_inline_data %}")
        self.assertIn('type="application/json"', result)
        self.assertIn('"nav.home"', result)

    @patch('i18n_django.templatetags.i18n._fetcher')
    def test_i18n_inline_data_empty_on_fetch_failure(self, mock_fetcher):
        mock_fetcher.fetch.return_value = None
        result = self._render("{% i18n_inline_data %}")
        self.assertEqual(result.strip(), '')
```

---

## End-to-End Example

```
my-django-app/
  requirements.txt          ← i18n-django
  my_project/
    settings.py             ← ShipEasyI18n = { "PUBLIC_KEY": ..., "PROFILE": ... }
    urls.py
  templates/
    base.html               ← {% load i18n %} {% i18n_head_tags %}
    dashboard.html          ← {% i18n_t "page.title" %}, data-label="..."
  my_app/
    views.py                ← from i18n_django import translate
```
