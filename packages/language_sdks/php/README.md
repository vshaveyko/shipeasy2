# `shipeasy` — PHP SDK

One Composer package. Supports Laravel 10/11, WordPress, Symfony, plain PHP-FPM, RoadRunner, Swoole, FrankenPHP. Covers both experimentation (flags, configs, experiments, events) and the string manager (i18n labels, translations, profile switching).

- PHP ≥ 8.2
- PSR-17 / PSR-18 HTTP interop (bring your own client; `guzzlehttp/guzzle` optional)
- Stateless-per-request by default (`initOnce()`), long-running mode supported (`init()`) for RoadRunner / Swoole / FrankenPHP workers

---

## Installation

```bash
composer require shipeasy/shipeasy
```

Framework extras (metapackages that pin compatible versions):

```bash
composer require shipeasy/laravel          # Laravel service provider + facade
composer require shipeasy/wordpress        # WordPress plugin shell
composer require shipeasy/symfony          # Symfony bundle
```

These extras are thin wrappers — zero duplication of networking or evaluation logic.

---

## Quick start

### Laravel

`config/shipeasy.php` (published by the service provider):

```php
<?php
return [
    'api_key'  => env('SHIPEASY_SERVER_KEY'),
    'base_url' => env('SHIPEASY_BASE_URL', 'https://api.shipeasy.ai'),
    'mode'     => env('SHIPEASY_MODE', 'once'), // 'once' (FPM) | 'long' (Octane/Swoole)
];
```

Usage in a controller:

```php
use Shipeasy\Client;

class CheckoutController extends Controller
{
    public function __construct(private Client $shipeasy) {}

    public function index(Request $request)
    {
        $user = [
            'user_id' => (string) auth()->id(),
            'plan'    => auth()->user()->plan,
        ];

        if ($this->shipeasy->getFlag('new_checkout', $user)) {
            return view('checkout.new');
        }

        $exp = $this->shipeasy->getExperiment(
            'checkout_button_color',
            ['color' => 'gray'],
            fn($raw) => ['color' => $raw['color'] ?? 'gray'],
        );

        $greeting = $this->shipeasy->t('en:prod', 'user.greeting', [
            'name' => auth()->user()->first_name,
        ]);

        $this->shipeasy->track((string) auth()->id(), 'purchase_completed', [
            'value' => $order->total,
        ]);

        return view('checkout.index', [
            'color'    => $exp->params['color'],
            'greeting' => $greeting,
        ]);
    }
}
```

Blade directives:

```blade
@shipeasyFlag('new_checkout')
  <div class="new-banner">…</div>
@endshipeasyFlag

{{ shipeasy_t('user.greeting', ['name' => $user->first_name]) }}
```

### WordPress

Install the `shipeasy/wordpress` plugin (or drop `vendor/` into the theme). The plugin registers:

- Admin screen under **Settings → Shipeasy** for the server key.
- `shipeasy_flag($name, $user = null)` helper.
- `shipeasy_t($key, $vars = [])` helper.
- A shortcode `[shipeasy_t key="user.greeting" name="{user_name}"]`.

```php
if (shipeasy_flag('new_checkout')) {
    include locate_template('checkout-new.php');
}
```

### Plain PHP-FPM / Apache mod_php

```php
<?php
require __DIR__ . '/vendor/autoload.php';

use Shipeasy\Client;

$shipeasy = new Client(['api_key' => getenv('SHIPEASY_SERVER_KEY')]);
$shipeasy->initOnce();   // single fetch per request — PHP-FPM stateless model

$user = ['user_id' => (string) ($_SESSION['user_id'] ?? '')];
if ($shipeasy->getFlag('new_checkout', $user)) {
    // new checkout
}
```

### RoadRunner / Swoole / FrankenPHP

```php
$shipeasy = new Client(['api_key' => getenv('SHIPEASY_SERVER_KEY')]);
$shipeasy->init();   // starts a Swoole coroutine timer / pcntl_fork poller

while ($request = $worker->waitRequest()) {
    $enabled = $shipeasy->getFlag('new_checkout', $user);
    // ...
}
$shipeasy->destroy();
```

---

## Namespace map

| Namespace                                  | Purpose                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| `Shipeasy\Client`                          | Core client (both experimentation and i18n).                               |
| `Shipeasy\ExperimentResult`                | Value object (`inExperiment`, `group`, `params`).                          |
| `Shipeasy\LabelBundle`                     | i18n bundle with `t()` + `onUpdate()` (long-running only).                 |
| `Shipeasy\Laravel\ShipeasyServiceProvider` | Binds `Client` as singleton, publishes config, registers blade directives. |
| `Shipeasy\Laravel\Facades\Shipeasy`        | Laravel facade for static-style usage.                                     |
| `Shipeasy\WordPress\Plugin`                | Plugin bootstrap + admin UI.                                               |
| `Shipeasy\Symfony\ShipeasyBundle`          | Symfony bundle registering the container service.                          |
| `Shipeasy\Testing\MockClient`              | PHPUnit-friendly in-memory implementation.                                 |

---

## Public API

```php
final class Shipeasy\Client
{
    public function __construct(array $config);
    // config keys: api_key (required), base_url, http_client (PSR-18), logger (PSR-3),
    //              poll_interval_seconds, timeout_seconds

    public function init(): void;
    public function initOnce(): void;
    public function destroy(): void;

    public function getFlag(string $name, array $user = []): bool;

    /** @template T @param callable(mixed): T $decoder @return T */
    public function getConfig(string $name, callable $decoder): mixed;

    /** @template T @param callable(mixed): T $decoder @return ExperimentResult<T> */
    public function getExperiment(string $name, mixed $defaultParams, callable $decoder): ExperimentResult;

    public function track(string $userId, string $eventName, array $props = []): void;

    public function loadLabels(string $profile, ?string $chunk = null): LabelBundle;
    public function t(string $profile, string $key, array $variables = []): string;
}
```

---

## Source layout

```
packages/language_sdks/php/
  README.md                          ← this file
  composer.json                      ← name: "shipeasy/shipeasy"
  src/
    Client.php
    Config.php
    ExperimentResult.php
    Hash/Murmur3.php
    Eval/GateEvaluator.php
    Eval/ExperimentEvaluator.php
    Transport/HttpTransport.php      ← PSR-18 client
    Transport/EventBuffer.php        ← in-process queue, flushed on destruct
    I18n/LabelBundle.php
    I18n/LabelLoader.php
  laravel/
    composer.json                    ← name: "shipeasy/laravel"
    src/
      ShipeasyServiceProvider.php
      Facades/Shipeasy.php
      Blade/Directives.php
      Middleware/AttachShipeasyUser.php
    config/shipeasy.php
    tests/Feature/...
  wordpress/
    composer.json                    ← name: "shipeasy/wordpress"
    shipeasy.php                     ← WP plugin entry
    src/
      Plugin.php
      Admin/SettingsPage.php
      Helpers.php                    ← shipeasy_flag(), shipeasy_t()
      Shortcodes.php
  symfony/
    composer.json                    ← name: "shipeasy/symfony"
    src/
      ShipeasyBundle.php
      DependencyInjection/...
  tests/
    HashVectorsTest.php              ← 5 cross-language vectors
    Eval/GateEvaluatorTest.php
    Eval/ExperimentEvaluatorTest.php
    I18n/LabelBundleTest.php
    Integration/WorkerIntegrationTest.php
```

Main package published to Packagist as `shipeasy/shipeasy`. Framework wrappers published as separate Packagist repos that only depend on `shipeasy/shipeasy: ^1.0`.

---

## Non-negotiables

- All 5 MurmurHash3 test vectors pass in pure PHP (no PECL extension required).
- Default mode is `initOnce()` — FPM workers fetch rules once per request, with a shared APCu cache of ETag + body keyed by project ID to avoid re-fetching on every request. Long-running mode (`init()`) only used when `SHIPEASY_MODE=long` or when Octane/Swoole/RoadRunner is detected.
- Events flush on shutdown via a registered destructor; never block the response. Failed sends are dropped silently (logged at `debug` via injected PSR-3 logger).
- Client is immutable after construction — `config()` methods are chainable on a builder, not on the live client.
- No direct `curl_*` calls — always goes through PSR-18. Guzzle is a test-time convenience only.
- Laravel service provider and WordPress plugin both have integration tests that spin up a mock HTTP server and assert `getFlag` + `t` behave correctly against fixture payloads.
