# Plan: ShipEasyI18n Laravel Integration

**Goal**: Provide a Laravel package (`i18n-laravel`) with a service provider, Blade directive, and facade for injecting inline label data server-side and translating strings in views, with Laravel's cache layer ensuring fast responses.
**Package**: `i18n-laravel` (Packagist)
**Key challenge**: Laravel's Blade directive system requires proper registration in a service provider, and the package must integrate with Laravel's cache abstraction (Redis, file, etc.) without imposing a specific driver. The service provider must work with Laravel's deferred binding and work correctly in both web and queue (CLI) contexts.

---

## Install

```bash
composer require i18n/laravel
```

The service provider is auto-discovered via Composer's `extra.laravel.providers` in `composer.json`. No manual registration needed for Laravel 5.5+.

```bash
php artisan vendor:publish --provider="ShipEasyI18n\Laravel\ShipEasyI18nServiceProvider" --tag="config"
```

This creates `config/i18n.php`.

---

## Package Structure

```
i18n-laravel/
  src/
    ShipEasyI18nServiceProvider.php     ← registers bindings, Blade directives, facade
    ShipEasyI18nManager.php             ← fetches labels, caches, translates
    ShipEasyI18nFacade.php              ← facade: ShipEasyI18n::t(), ShipEasyI18n::inlineData()
    Directives/
      ShipEasyI18nDirectives.php        ← @i18nHeadTags, @i18nInlineData, @i18nT
  config/
    i18n.php                    ← package config
  resources/
    views/
      inline-data.blade.php    ← script tag partial
```

---

## Config: `config/i18n.php`

```php
<?php

return [
    /*
    |--------------------------------------------------------------------------
    | ShipEasyI18n Public Key
    |--------------------------------------------------------------------------
    | Embedded in the loader.js script tag. Visible in browser.
    | Get it from https://app.i18n.shipeasy.ai/keys
    */
    'public_key' => env('ShipEasyI18n_KEY', ''),

    /*
    |--------------------------------------------------------------------------
    | Default Profile
    |--------------------------------------------------------------------------
    | Label profile string, e.g. "en:prod" or "fr:prod"
    */
    'profile' => env('ShipEasyI18n_PROFILE', 'en:prod'),

    /*
    |--------------------------------------------------------------------------
    | Default Chunk
    |--------------------------------------------------------------------------
    | Chunk to preload in every page <head>. Usually "index".
    */
    'default_chunk' => 'index',

    /*
    |--------------------------------------------------------------------------
    | CDN URLs
    |--------------------------------------------------------------------------
    */
    'cdn_base_url' => 'https://cdn.i18n.shipeasy.ai',
    'loader_url'   => 'https://cdn.i18n.shipeasy.ai/loader.js',

    /*
    |--------------------------------------------------------------------------
    | Cache TTL (seconds)
    |--------------------------------------------------------------------------
    | manifest.json: short TTL (60s) — invalidated by Cloudflare purge on publish
    | Label files: long TTL (3600s) — immutable, content-addressed
    */
    'manifest_cache_ttl'    => 60,
    'label_file_cache_ttl'  => 3600,

    /*
    |--------------------------------------------------------------------------
    | HTTP Timeout (seconds)
    |--------------------------------------------------------------------------
    | Maximum time to wait for CDN response during SSR.
    | 1s is sufficient — CDN P99 is <50ms on cache hit.
    */
    'http_timeout' => 1,
];
```

---

## Full Source

### `src/ShipEasyI18nManager.php`

```php
<?php

namespace ShipEasyI18n\Laravel;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class ShipEasyI18nManager
{
    protected array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    /**
     * Fetch the label file for the given profile and chunk.
     * Returns the label file array or null on failure.
     */
    public function fetchLabels(?string $profile = null, ?string $chunk = null): ?array
    {
        $profile = $profile ?? $this->config['profile'];
        $chunk   = $chunk   ?? $this->config['default_chunk'];

        $manifest = $this->fetchManifest($profile);
        if ($manifest === null) {
            return null;
        }

        $fileUrl = $manifest[$chunk] ?? null;
        if ($fileUrl === null) {
            Log::warning("[ShipEasyI18n] Chunk '{$chunk}' not found in manifest for profile '{$profile}'");
            return null;
        }

        return $this->fetchLabelFile($fileUrl);
    }

    /**
     * Translate a label key using cached labels.
     * Returns the key as fallback on cache miss or fetch failure.
     */
    public function t(string $key, array $variables = [], ?string $profile = null, ?string $chunk = null): string
    {
        $labelFile = $this->fetchLabels($profile, $chunk);

        if ($labelFile === null || empty($labelFile['strings'])) {
            return $key;
        }

        $value = $labelFile['strings'][$key] ?? $key;

        foreach ($variables as $k => $v) {
            $value = str_replace("{{{{$k}}}", $v, $value);
        }

        return $value;
    }

    /**
     * Returns the raw label file array for direct use in Blade views.
     */
    public function labelFile(?string $profile = null, ?string $chunk = null): ?array
    {
        return $this->fetchLabels($profile, $chunk);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    protected function fetchManifest(string $profile): ?array
    {
        $cacheKey = "i18n:manifest:{$this->config['public_key']}:{$profile}";

        return Cache::remember(
            $cacheKey,
            $this->config['manifest_cache_ttl'],
            function () use ($profile) {
                $url = "{$this->config['cdn_base_url']}/labels/{$this->config['public_key']}/{$profile}/manifest.json";
                return $this->httpGet($url);
            }
        );
    }

    protected function fetchLabelFile(string $url): ?array
    {
        $cacheKey = "i18n:label:" . md5($url);

        return Cache::remember(
            $cacheKey,
            $this->config['label_file_cache_ttl'],
            fn() => $this->httpGet($url)
        );
    }

    protected function httpGet(string $url): ?array
    {
        try {
            $response = Http::timeout($this->config['http_timeout'])
                ->accept('application/json')
                ->get($url);

            if ($response->successful()) {
                return $response->json();
            }

            Log::warning("[ShipEasyI18n] HTTP {$response->status()} fetching {$url}");
        } catch (\Exception $e) {
            Log::warning("[ShipEasyI18n] Error fetching {$url}: {$e->getMessage()}");
        }

        return null;
    }
}
```

### `src/ShipEasyI18nFacade.php`

```php
<?php

namespace ShipEasyI18n\Laravel;

use Illuminate\Support\Facades\Facade;

/**
 * @method static string t(string $key, array $variables = [], ?string $profile = null, ?string $chunk = null)
 * @method static array|null fetchLabels(?string $profile = null, ?string $chunk = null)
 * @method static array|null labelFile(?string $profile = null, ?string $chunk = null)
 * @see \ShipEasyI18n\Laravel\ShipEasyI18nManager
 */
class ShipEasyI18nFacade extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return ShipEasyI18nManager::class;
    }
}
```

### `src/ShipEasyI18nServiceProvider.php`

```php
<?php

namespace ShipEasyI18n\Laravel;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Blade;

class ShipEasyI18nServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../config/i18n.php', 'i18n');

        $this->app->singleton(ShipEasyI18nManager::class, function ($app) {
            return new ShipEasyI18nManager($app['config']['i18n']);
        });

        $this->app->alias(ShipEasyI18nManager::class, 'i18n');
    }

    public function boot(): void
    {
        // Publish config
        $this->publishes([
            __DIR__ . '/../config/i18n.php' => config_path('i18n.php'),
        ], 'config');

        // Publish views
        $this->publishes([
            __DIR__ . '/../resources/views' => resource_path('views/vendor/i18n'),
        ], 'views');

        $this->loadViewsFrom(__DIR__ . '/../resources/views', 'i18n');

        $this->registerBladeDirectives();
    }

    protected function registerBladeDirectives(): void
    {
        /**
         * @i18nInlineData
         * @i18nInlineData(['profile' => 'fr:prod', 'chunk' => 'checkout'])
         *
         * Renders <script id="i18n-data" type="application/json"> with label data.
         */
        Blade::directive('i18nInlineData', function (string $expression) {
            $opts = $expression ?: '[]';
            return "<?php echo app('" . ShipEasyI18nManager::class . "')->renderInlineData($opts); ?>";
        });

        /**
         * @i18nScriptTag
         * @i18nScriptTag(['hide_until_ready' => true])
         *
         * Renders <script src="https://cdn.i18n.shipeasy.ai/loader.js" ...>.
         */
        Blade::directive('i18nScriptTag', function (string $expression) {
            $opts = $expression ?: '[]';
            return "<?php echo app('" . ShipEasyI18nManager::class . "')->renderScriptTag($opts); ?>";
        });

        /**
         * @i18nHeadTags
         * @i18nHeadTags(['profile' => 'fr:prod'])
         *
         * Renders both inline data and script tag.
         */
        Blade::directive('i18nHeadTags', function (string $expression) {
            $opts = $expression ?: '[]';
            return "<?php echo app('" . ShipEasyI18nManager::class . "')->renderHeadTags($opts); ?>";
        });

        /**
         * @i18nT('nav.home')
         * @i18nT('user.greeting', ['name' => $user->name])
         *
         * Renders a translated string inline.
         */
        Blade::directive('i18nT', function (string $expression) {
            return "<?php echo e(app('" . ShipEasyI18nManager::class . "')->t($expression)); ?>";
        });
    }
}
```

Add render methods to `ShipEasyI18nManager`:

```php
// In ShipEasyI18nManager.php — add these public methods:

public function renderInlineData(array $options = []): string
{
    $profile = $options['profile'] ?? null;
    $chunk   = $options['chunk']   ?? null;

    $labelFile = $this->fetchLabels($profile, $chunk);
    if ($labelFile === null) {
        return '';
    }

    // json_encode escapes < > & by default — safe for type="application/json"
    $json = json_encode($labelFile, JSON_UNESCAPED_UNICODE);
    return "<script id=\"i18n-data\" type=\"application/json\">{$json}</script>";
}

public function renderScriptTag(array $options = []): string
{
    $loaderUrl  = $this->config['loader_url'];
    $publicKey  = $this->config['public_key'];
    $profile    = $this->config['profile'];
    $hideUntilReady = $options['hide_until_ready'] ?? false;

    $attrs = "src=\"{$loaderUrl}\" data-key=\"{$publicKey}\" data-profile=\"{$profile}\" async";
    if ($hideUntilReady) {
        $attrs .= ' data-hide-until-ready="true"';
    }

    return "<script {$attrs}></script>";
}

public function renderHeadTags(array $options = []): string
{
    return implode("\n", [
        $this->renderInlineData($options),
        $this->renderScriptTag($options),
    ]);
}
```

---

## Blade Usage

### Master layout: `resources/views/layouts/app.blade.php`

```blade
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@i18nT('page.title')</title>

    @i18nHeadTags
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
    @yield('content')
</body>
</html>
```

### Page template

```blade
@extends('layouts.app')

@section('content')
<div class="container">
    <h1 data-label="page.dashboard.title">
        @i18nT('page.dashboard.title')
    </h1>

    <span
        data-label="user.greeting"
        data-variables='{"name": "{{ $user->first_name }}"}'>
        @i18nT('user.greeting', ['name' => $user->first_name])
    </span>

    <nav>
        <a href="/" data-label="nav.home">@i18nT('nav.home')</a>
    </nav>

    <input
        type="email"
        data-label="form.email.placeholder"
        data-label-attr="placeholder"
        placeholder="@i18nT('form.email.placeholder')">
</div>
@endsection
```

### Per-page chunk override

```blade
@push('head')
    @i18nInlineData(['chunk' => 'checkout'])
@endpush
```

---

## Facade Usage in Controllers

```php
<?php

namespace App\Http\Controllers;

use ShipEasyI18n\Laravel\ShipEasyI18nFacade as ShipEasyI18n;

class DashboardController extends Controller
{
    public function index()
    {
        $title = ShipEasyI18n::t('page.dashboard.title');
        $greeting = ShipEasyI18n::t('user.greeting', ['name' => auth()->user()->name]);

        return view('dashboard', compact('title', 'greeting'));
    }
}
```

## Helper Function

Register a global `i18n_t()` helper in a helpers file:

```php
// app/helpers.php (autoloaded in composer.json)
if (!function_exists('i18n_t')) {
    function i18n_t(string $key, array $variables = [], ?string $profile = null): string {
        return app(\ShipEasyI18n\Laravel\ShipEasyI18nManager::class)->t($key, $variables, $profile);
    }
}
```

```blade
<title>{{ i18n_t('page.title') }}</title>
```

---

## Per-Request Locale

For multi-language apps:

```php
// app/Http/Middleware/SetShipEasyI18nLocale.php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

class SetShipEasyI18nLocale
{
    public function handle(Request $request, Closure $next)
    {
        // Read locale from session, cookie, or Accept-Language
        $locale = $request->session()->get('locale', 'en');
        $profile = "{$locale}:prod";

        // Override the config for this request
        config(['i18n.profile' => $profile]);

        return $next($request);
    }
}
```

Register in `app/Http/Kernel.php`:

```php
protected $middlewareGroups = [
    'web' => [
        // ...
        \App\Http\Middleware\SetShipEasyI18nLocale::class,
    ],
];
```

Then in templates, `@i18nHeadTags` automatically uses the updated config.

---

## Livewire Integration

Livewire components re-render server-side on every user interaction. `i18n_t()` works normally in Livewire Blade views — the cache ensures no added latency:

```blade
{{-- resources/views/livewire/checkout-form.blade.php --}}
<div>
    <h2>@i18nT('checkout.form.title')</h2>
    <label>@i18nT('form.email.label')</label>
    <input wire:model="email" type="email">
</div>
```

Labels are translated on each Livewire re-render (cache hit — instant).

---

## Caching Strategy

### Cache driver

Uses `Cache::remember()` — works with any driver configured in `config/cache.php`:

```php
// config/cache.php
'default' => env('CACHE_DRIVER', 'redis'), // or 'file', 'array', 'database'
```

### Cache key format

```
i18n:manifest:{public_key}:{profile}   → TTL: manifest_cache_ttl (60s)
i18n:label:{md5(file_url)}             → TTL: label_file_cache_ttl (3600s)
```

### Cache clearing on deploy

If you need to force-refresh labels on deploy:

```bash
php artisan cache:forget "i18n:manifest:i18n_pk_abc123:en:prod"
# Or clear all ShipEasyI18n cache keys:
php artisan cache:clear --tags=i18n   # (requires taggable cache driver)
```

To use cache tags, wrap in `Cache::tags(['i18n'])`:

```php
Cache::tags(['i18n'])->remember($cacheKey, $ttl, $callback);
// Clear all ShipEasyI18n cache:
Cache::tags(['i18n'])->flush();
```

---

## Edge Cases

### Artisan queue workers

Queue workers (Horizon, etc.) may call `ShipEasyI18n::t()` in job handlers. The cache is shared with the web process, so it works correctly. Avoid using `@i18nInlineData` in queue jobs (no HTML rendering context).

### Laravel Octane (Swoole/RoadRunner)

Octane shares process state between requests. `ShipEasyI18nManager` is a singleton — safe because it has no request-specific state. The cache is used for label data, not instance variables.

However, if you use `config(['i18n.profile' => $profile])` per-request (for locale switching), be careful: `config()` in Octane is shared across coroutines. Use request-scoped state instead:

```php
// OctaneServiceProvider.php
$this->app->scoped(ShipEasyI18nManager::class, function ($app) {
    return new ShipEasyI18nManager($app['config']['i18n']);
});
```

### Blade directive in loops

Calling `@i18nT` inside a `@foreach` loop hits the cache on each iteration. Cache reads are fast (memory), but avoid it in very large loops. Pre-translate outside the loop:

```blade
@php $homeLabel = ShipEasyI18n::t('nav.home') @endphp

@foreach ($items as $item)
    <span>{{ $homeLabel }}</span>
@endforeach
```

### XSS in `renderInlineData`

`json_encode($labelFile)` in PHP escapes `<`, `>`, `&` as `\u003C`, `\u003E`, `\u0026` by default (`JSON_HEX_TAG` flag). The result inside `<script type="application/json">` is safe.

If you need Unicode characters (e.g., French, Japanese) unescaped, use `json_encode($labelFile, JSON_UNESCAPED_UNICODE)`. This is safe in `type="application/json"` context because the browser doesn't parse it as JavaScript.

### `Blade::directive` vs `Blade::component`

Blade directives compile to PHP at template compile time. Using `app(ShipEasyI18nManager::class)` inside the directive resolves via the container at runtime — correct behavior. Alternatively, use Blade components (anonymous or class-based) for more complex output.

---

## Test Commands

```bash
./vendor/bin/pest          # Pest PHP testing
./vendor/bin/phpunit       # PHPUnit
composer run lint          # PHP CS Fixer / Pint
php artisan test           # Laravel test runner
```

### Unit Test

```php
<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use ShipEasyI18n\Laravel\ShipEasyI18nManager;

class ShipEasyI18nManagerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_returns_key_as_fallback_on_fetch_failure(): void
    {
        Http::fake(['*' => Http::response(null, 500)]);

        $manager = new ShipEasyI18nManager(config('i18n'));
        $this->assertEquals('nav.home', $manager->t('nav.home'));
    }

    public function test_translates_key_from_label_file(): void
    {
        Http::fake([
            '*/manifest.json' => Http::response(['index' => 'https://cdn.i18n.shipeasy.ai/labels/test/en-prod/index.abc.json']),
            '*/index.abc.json' => Http::response([
                'v' => 1,
                'profile' => 'en:prod',
                'chunk' => 'index',
                'strings' => ['nav.home' => 'Home'],
            ]),
        ]);

        $manager = new ShipEasyI18nManager(config('i18n'));
        $this->assertEquals('Home', $manager->t('nav.home'));
    }

    public function test_interpolates_variables(): void
    {
        Http::fake([
            '*/manifest.json' => Http::response(['index' => 'https://cdn.i18n.shipeasy.ai/labels/test/en-prod/index.abc.json']),
            '*/index.abc.json' => Http::response([
                'v' => 1, 'strings' => ['user.greeting' => 'Hello, {{name}}!']
            ]),
        ]);

        $manager = new ShipEasyI18nManager(config('i18n'));
        $this->assertEquals('Hello, Alice!', $manager->t('user.greeting', ['name' => 'Alice']));
    }

    public function test_renders_inline_data_script_tag(): void
    {
        Http::fake([
            '*/manifest.json' => Http::response(['index' => 'https://cdn.i18n.shipeasy.ai/labels/test/en-prod/index.abc.json']),
            '*/index.abc.json' => Http::response(['v' => 1, 'strings' => ['nav.home' => 'Home']]),
        ]);

        $manager = new ShipEasyI18nManager(config('i18n'));
        $html = $manager->renderInlineData();

        $this->assertStringContainsString('type="application/json"', $html);
        $this->assertStringContainsString('"nav.home"', $html);
    }
}
```

---

## End-to-End Example

```
my-laravel-app/
  composer.json             ← require i18n/laravel
  config/
    i18n.php                 ← published config
  resources/
    views/
      layouts/
        app.blade.php       ← @i18nHeadTags in <head>
      dashboard/
        index.blade.php     ← @i18nT('key'), data-label="..."
  app/
    Http/
      Controllers/
        DashboardController.php  ← ShipEasyI18n::t('key')
      Middleware/
        SetShipEasyI18nLocale.php         ← config(['i18n.profile' => $profile])
```
