# Plan: ShipEasyI18n WordPress Plugin

**Goal**: Provide a WordPress plugin that hooks into `wp_head` to inject inline label data and the loader.js script tag, exposes a `[i18n]` shortcode for translated strings, and provides a Gutenberg block for visual editors.
**Package**: WordPress plugin `i18n-for-wordpress` (distributed via WordPress.org plugin directory or direct download)
**Key challenge**: WordPress is a PHP-based CMS with no build step. The plugin must integrate with WordPress's hook system (`add_action`, `add_filter`), use the WordPress HTTP API (`wp_remote_get`) and transients for caching, and provide a settings UI using the WordPress Settings API — without requiring Composer or any PHP package manager.

---

## Install

**Option A: WordPress.org plugin directory**
Search "ShipEasyI18n Label Rewrite Service" in Plugins → Add New, or:

```bash
wp plugin install i18n-for-wordpress --activate
```

**Option B: Manual install**

1. Download `i18n-for-wordpress.zip`
2. Upload to `wp-content/plugins/`
3. Activate via Plugins admin screen

**Option C: Composer (if using Bedrock/Roots)**

```bash
composer require wpackagist-plugin/i18n-for-wordpress
```

---

## Plugin File Structure

```
i18n-for-wordpress/
  i18n-for-wordpress.php     ← main plugin file, hooks registration
  includes/
    class-i18n-fetcher.php   ← WordPress HTTP API + transients caching
    class-i18n-settings.php  ← Settings API registration
    class-i18n-shortcode.php ← [i18n] shortcode
    class-i18n-block.php     ← Gutenberg block registration
  assets/
    js/
      i18n-block.js          ← Gutenberg block JavaScript (built from src)
    css/
      i18n-block.css         ← Block editor styles
  src/
    block/
      index.js              ← Gutenberg block source
  block.json                ← Block metadata
  readme.txt                ← WordPress plugin readme
```

---

## Main Plugin File

### `i18n-for-wordpress.php`

```php
<?php
/**
 * Plugin Name: ShipEasyI18n Label Rewrite Service
 * Plugin URI:  https://i18n.shipeasy.ai
 * Description: Override and translate UI strings on your WordPress site via ShipEasyI18n.
 * Version:     1.0.0
 * Author:      ShipEasyI18n Team
 * License:     MIT
 * Text Domain: i18n-for-wordpress
 */

if (!defined('ABSPATH')) exit;

define('ShipEasyI18n_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ShipEasyI18n_PLUGIN_URL', plugin_dir_url(__FILE__));
define('ShipEasyI18n_VERSION', '1.0.0');

require_once ShipEasyI18n_PLUGIN_DIR . 'includes/class-i18n-fetcher.php';
require_once ShipEasyI18n_PLUGIN_DIR . 'includes/class-i18n-settings.php';
require_once ShipEasyI18n_PLUGIN_DIR . 'includes/class-i18n-shortcode.php';
require_once ShipEasyI18n_PLUGIN_DIR . 'includes/class-i18n-block.php';

// Initialize on plugins_loaded
add_action('plugins_loaded', function () {
    new ShipEasyI18n_Settings();
    new ShipEasyI18n_Shortcode();
    new ShipEasyI18n_Block();
});

// Inject head tags
add_action('wp_head', 'i18n_inject_head_tags', 1); // priority 1 = early in head

function i18n_inject_head_tags(): void {
    $public_key = get_option('i18n_public_key', '');
    $profile    = get_option('i18n_profile', 'en:prod');
    $loader_url = get_option('i18n_loader_url', 'https://cdn.i18n.shipeasy.ai/loader.js');
    $chunk      = get_option('i18n_default_chunk', 'index');

    if (empty($public_key)) return;

    $fetcher   = new ShipEasyI18n_Fetcher($public_key, $profile);
    $label_file = $fetcher->fetch($chunk);

    if ($label_file !== null) {
        $json = wp_json_encode($label_file);
        echo "<script id=\"i18n-data\" type=\"application/json\">{$json}</script>\n";
    }

    $hide_until_ready = get_option('i18n_hide_until_ready', false) ? ' data-hide-until-ready="true"' : '';
    $key_attr     = esc_attr($public_key);
    $profile_attr = esc_attr($profile);
    $loader_url   = esc_url($loader_url);

    echo "<script src=\"{$loader_url}\" data-key=\"{$key_attr}\" data-profile=\"{$profile_attr}\" async{$hide_until_ready}></script>\n";
}

// Global template tag
function i18n_t(string $key, array $variables = [], ?string $chunk = null): string {
    $public_key = get_option('i18n_public_key', '');
    $profile    = get_option('i18n_profile', 'en:prod');

    if (empty($public_key)) return $key;

    $fetcher    = new ShipEasyI18n_Fetcher($public_key, $profile);
    $label_file = $fetcher->fetch($chunk ?? get_option('i18n_default_chunk', 'index'));

    if ($label_file === null || empty($label_file['strings'])) {
        return $key;
    }

    $value = $label_file['strings'][$key] ?? $key;

    foreach ($variables as $k => $v) {
        $value = str_replace("{{{{$k}}}", $v, $value);
    }

    return $value;
}
```

---

## Fetcher Class

### `includes/class-i18n-fetcher.php`

```php
<?php

if (!defined('ABSPATH')) exit;

class ShipEasyI18n_Fetcher {
    private string $public_key;
    private string $profile;
    private string $cdn_base;

    public function __construct(string $public_key, string $profile) {
        $this->public_key = $public_key;
        $this->profile    = $profile;
        $this->cdn_base   = 'https://cdn.i18n.shipeasy.ai';
    }

    /**
     * Fetch the label file for the given chunk.
     * Uses WordPress transients for caching.
     *
     * @param string $chunk
     * @return array|null Label file array or null on failure
     */
    public function fetch(string $chunk = 'index'): ?array {
        $manifest = $this->fetch_manifest();
        if ($manifest === null) return null;

        $file_url = $manifest[$chunk] ?? null;
        if ($file_url === null) {
            error_log("[ShipEasyI18n] Chunk '{$chunk}' not found in manifest");
            return null;
        }

        return $this->fetch_label_file($file_url);
    }

    private function fetch_manifest(): ?array {
        $transient_key = 'i18n_manifest_' . md5("{$this->public_key}_{$this->profile}");
        $cached = get_transient($transient_key);

        if ($cached !== false) {
            return $cached;
        }

        $url  = "{$this->cdn_base}/labels/{$this->public_key}/{$this->profile}/manifest.json";
        $data = $this->http_get($url);

        if ($data !== null) {
            // Transient TTL: 60 seconds (matches manifest cache-control)
            set_transient($transient_key, $data, 60);
        }

        return $data;
    }

    private function fetch_label_file(string $url): ?array {
        $transient_key = 'i18n_label_' . md5($url);
        $cached = get_transient($transient_key);

        if ($cached !== false) {
            return $cached;
        }

        $data = $this->http_get($url);

        if ($data !== null) {
            // Immutable files — cache for 1 hour
            set_transient($transient_key, $data, 3600);
        }

        return $data;
    }

    private function http_get(string $url): ?array {
        $response = wp_remote_get($url, [
            'timeout'    => 1,
            'user-agent' => 'ShipEasyI18n WordPress Plugin/' . ShipEasyI18n_VERSION,
            'headers'    => ['Accept' => 'application/json'],
        ]);

        if (is_wp_error($response)) {
            error_log('[ShipEasyI18n] HTTP error: ' . $response->get_error_message());
            return null;
        }

        $code = wp_remote_retrieve_response_code($response);
        if ($code !== 200) {
            error_log("[ShipEasyI18n] HTTP {$code} fetching {$url}");
            return null;
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('[ShipEasyI18n] JSON decode error: ' . json_last_error_msg());
            return null;
        }

        return $data;
    }
}
```

---

## Settings Class

### `includes/class-i18n-settings.php`

```php
<?php

if (!defined('ABSPATH')) exit;

class ShipEasyI18n_Settings {
    public function __construct() {
        add_action('admin_menu', [$this, 'add_menu']);
        add_action('admin_init', [$this, 'register_settings']);
    }

    public function add_menu(): void {
        add_options_page(
            'ShipEasyI18n Settings',
            'ShipEasyI18n Labels',
            'manage_options',
            'i18n-settings',
            [$this, 'render_page']
        );
    }

    public function register_settings(): void {
        register_setting('i18n_options', 'i18n_public_key', [
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => '',
        ]);
        register_setting('i18n_options', 'i18n_profile', [
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => 'en:prod',
        ]);
        register_setting('i18n_options', 'i18n_default_chunk', [
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => 'index',
        ]);
        register_setting('i18n_options', 'i18n_loader_url', [
            'type'              => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default'           => 'https://cdn.i18n.shipeasy.ai/loader.js',
        ]);
        register_setting('i18n_options', 'i18n_hide_until_ready', [
            'type'    => 'boolean',
            'default' => false,
        ]);

        add_settings_section('i18n_main', 'ShipEasyI18n Configuration', null, 'i18n-settings');

        add_settings_field('i18n_public_key', 'Public Key (i18n_pk_...)', [$this, 'field_public_key'], 'i18n-settings', 'i18n_main');
        add_settings_field('i18n_profile', 'Profile', [$this, 'field_profile'], 'i18n-settings', 'i18n_main');
        add_settings_field('i18n_default_chunk', 'Default Chunk', [$this, 'field_chunk'], 'i18n-settings', 'i18n_main');
        add_settings_field('i18n_hide_until_ready', 'Hide Until Ready', [$this, 'field_hide_until_ready'], 'i18n-settings', 'i18n_main');
    }

    public function render_page(): void {
        if (!current_user_can('manage_options')) return;
        ?>
        <div class="wrap">
            <h1>ShipEasyI18n Label Rewrite Service</h1>
            <form action="options.php" method="post">
                <?php
                settings_fields('i18n_options');
                do_settings_sections('i18n-settings');
                submit_button('Save Settings');
                ?>
            </form>
        </div>
        <?php
    }

    public function field_public_key(): void {
        $value = esc_attr(get_option('i18n_public_key', ''));
        echo "<input type='text' name='i18n_public_key' value='{$value}' class='regular-text' placeholder='i18n_pk_...'>";
        echo "<p class='description'>Get your public key from <a href='https://app.i18n.shipeasy.ai/keys' target='_blank'>app.i18n.shipeasy.ai/keys</a></p>";
    }

    public function field_profile(): void {
        $value = esc_attr(get_option('i18n_profile', 'en:prod'));
        echo "<input type='text' name='i18n_profile' value='{$value}' class='regular-text' placeholder='en:prod'>";
    }

    public function field_chunk(): void {
        $value = esc_attr(get_option('i18n_default_chunk', 'index'));
        echo "<input type='text' name='i18n_default_chunk' value='{$value}' class='regular-text' placeholder='index'>";
    }

    public function field_hide_until_ready(): void {
        $checked = get_option('i18n_hide_until_ready', false) ? 'checked' : '';
        echo "<input type='checkbox' name='i18n_hide_until_ready' value='1' {$checked}>";
        echo "<p class='description'>Hides body until labels load. Impacts FCP/LCP scores. Not recommended.</p>";
    }
}
```

---

## Shortcode

### `includes/class-i18n-shortcode.php`

```php
<?php

if (!defined('ABSPATH')) exit;

class ShipEasyI18n_Shortcode {
    public function __construct() {
        add_shortcode('i18n', [$this, 'render']);
    }

    /**
     * Shortcode: [i18n key="nav.home"]
     * Shortcode: [i18n key="user.greeting" name="Alice"]
     * Shortcode: [i18n key="checkout.title" chunk="checkout"]
     *
     * All attributes except "key" and "chunk" are treated as variables.
     */
    public function render(array $atts): string {
        $atts = shortcode_atts([
            'key'   => '',
            'chunk' => null,
        ], $atts, 'i18n');

        if (empty($atts['key'])) {
            return '';
        }

        // Remaining attributes are variables for interpolation
        $variables = array_diff_key($atts, ['key' => '', 'chunk' => '']);

        return esc_html(i18n_t($atts['key'], $variables, $atts['chunk'] ?: null));
    }
}
```

### Shortcode Usage in Posts/Pages

```
[i18n key="nav.home"]
[i18n key="user.greeting" name="Alice"]
[i18n key="checkout.summary.total" chunk="checkout"]
```

### Shortcode in PHP Templates

```php
<!-- In theme templates -->
<h1 data-label="page.title"><?php echo i18n_t('page.title'); ?></h1>

<span
    data-label="user.greeting"
    data-variables='<?php echo esc_attr(json_encode(['name' => $current_user->display_name])); ?>'>
    <?php echo esc_html(i18n_t('user.greeting', ['name' => $current_user->display_name])); ?>
</span>
```

---

## Gutenberg Block

### `block.json`

```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 2,
  "name": "i18n/string",
  "version": "1.0.0",
  "title": "ShipEasyI18n String",
  "category": "text",
  "description": "Display a translated string from ShipEasyI18n Label Rewrite Service",
  "keywords": ["translate", "i18n", "i18n"],
  "attributes": {
    "labelKey": {
      "type": "string",
      "default": ""
    },
    "desc": {
      "type": "string",
      "default": ""
    }
  },
  "editorScript": "file:./assets/js/i18n-block.js",
  "editorStyle": "file:./assets/css/i18n-block.css",
  "render": "file:./render.php"
}
```

### `render.php` (server-side block render)

```php
<?php
// Block render callback
$key  = $attributes['labelKey'] ?? '';
$desc = $attributes['desc'] ?? '';

if (empty($key)) {
    echo '<span class="i18n-empty-block">[No label key set]</span>';
    return;
}

$translated = i18n_t($key);
?>
<span
    data-label="<?php echo esc_attr($key); ?>"
    <?php if ($desc): ?>data-label-desc="<?php echo esc_attr($desc); ?>"<?php endif; ?>
>
    <?php echo esc_html($translated); ?>
</span>
```

### `includes/class-i18n-block.php`

```php
<?php

if (!defined('ABSPATH')) exit;

class ShipEasyI18n_Block {
    public function __construct() {
        add_action('init', [$this, 'register_block']);
    }

    public function register_block(): void {
        if (!function_exists('register_block_type')) return; // pre-Gutenberg guard

        register_block_type(ShipEasyI18n_PLUGIN_DIR . 'block.json');
    }
}
```

### `src/block/index.js` (Gutenberg block editor UI)

```javascript
import { registerBlockType } from "@wordpress/blocks";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { PanelBody, TextControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import metadata from "../../block.json";

registerBlockType(metadata.name, {
  edit: ({ attributes, setAttributes }) => {
    const { labelKey, desc } = attributes;
    const blockProps = useBlockProps();

    return (
      <>
        <InspectorControls>
          <PanelBody title={__("ShipEasyI18n Settings", "i18n-for-wordpress")}>
            <TextControl
              label={__("Label Key", "i18n-for-wordpress")}
              value={labelKey}
              onChange={(val) => setAttributes({ labelKey: val })}
              placeholder="nav.home"
            />
            <TextControl
              label={__("Description (for translators)", "i18n-for-wordpress")}
              value={desc}
              onChange={(val) => setAttributes({ desc: val })}
            />
          </PanelBody>
        </InspectorControls>
        <div {...blockProps}>
          <span
            data-label={labelKey}
            data-label-desc={desc}
            style={{ outline: "2px dashed #2271b1", padding: "2px 4px" }}
          >
            {labelKey || __("[No label key set]", "i18n-for-wordpress")}
          </span>
        </div>
      </>
    );
  },

  save: () => null, // Server-rendered via render.php
});
```

Build command (add to `package.json`):

```json
{
  "scripts": {
    "build": "wp-scripts build src/block/index.js --output-path=assets/js",
    "start": "wp-scripts start src/block/index.js --output-path=assets/js"
  },
  "devDependencies": {
    "@wordpress/scripts": "^27.0.0"
  }
}
```

---

## Caching Strategy

### WordPress Transients

`ShipEasyI18n_Fetcher` uses `set_transient()` / `get_transient()` — WordPress's standard caching API.

- In production with an object cache (Redis via `wp-redis`, Memcached via `wp-memcached`): transients are stored in the object cache — fast, shared across processes.
- Without an object cache: transients are stored in the `wp_options` table — slower, adds a DB query on cache miss.

**Recommendation**: Install `wp-redis` or `wp-memcached` for production WordPress sites using ShipEasyI18n.

### Transient key length

WordPress transient keys are limited to 172 characters. The keys used here:

```
i18n_manifest_{md5($public_key . '_' . $profile)}  = 13 + 32 = 45 chars ✓
i18n_label_{md5($url)}                              = 10 + 32 = 42 chars ✓
```

Both are well within the limit.

### Cache invalidation on ShipEasyI18n publish

When a customer publishes new labels via the ShipEasyI18n dashboard, the CDN manifest is purged instantly. WordPress transients will serve stale data for up to 60 seconds (manifest TTL). To force immediate refresh after publishing:

```php
// Add to your deployment or ShipEasyI18n webhook handler
function i18n_clear_cache(): void {
    global $wpdb;
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_i18n_%'");
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_i18n_%'");
}
add_action('i18n_publish', 'i18n_clear_cache');
```

Or use WP-CLI:

```bash
wp transient delete --all
```

---

## Theme Integration

Add to `functions.php`:

```php
// functions.php
function my_theme_enqueue() {
    // ShipEasyI18n is injected in wp_head — no additional enqueue needed
}
add_action('wp_enqueue_scripts', 'my_theme_enqueue');
```

In theme template files:

```php
// header.php
<h1 data-label="site.tagline">
    <?php echo esc_html(i18n_t('site.tagline')); ?>
</h1>

// page.php
<title><?php echo esc_html(i18n_t('page.' . get_the_slug() . '.title')); ?></title>
```

---

## WooCommerce Integration

```php
// functions.php
add_filter('woocommerce_product_add_to_cart_text', function ($text) {
    return i18n_t('woocommerce.add_to_cart', [], 'woocommerce');
}, 10);

add_filter('woocommerce_checkout_submit_button_text', function ($text) {
    return i18n_t('woocommerce.place_order', [], 'woocommerce');
}, 10);
```

---

## Edge Cases

### wp_kses and HTML in labels

`i18n_t()` returns a plain string. If label values contain HTML (intentional), use `wp_kses_post()` instead of `esc_html()` when outputting:

```php
echo wp_kses_post(i18n_t('promo.banner.text'));
```

Normally, label values should be plain text — HTML formatting belongs in the template.

### Elementor / Page Builders

Most page builders support shortcodes. Use `[i18n key="..."]` in any text field that supports shortcodes. The in-browser editor's MutationObserver handles dynamically rendered builder content automatically.

### Caching plugins (WP Rocket, W3 Total Cache)

Full-page caching will serve the same HTML (with inline label data) to all visitors. This is correct — inline label data is the same for all users. Labels are cached on the CDN, not user-specific.

If the caching plugin captures HTML before `wp_head` fires (rare), ShipEasyI18n inline data may be missing. Exclude the ShipEasyI18n data from page caching exclusion rules if needed.

### Multisite

For WordPress multisite, each site can have its own ShipEasyI18n settings. The `get_option` calls are site-scoped by default in multisite. The transient keys include the public key, so different sites don't share label caches.

### REST API Endpoints

```php
add_action('rest_api_init', function () {
    register_rest_route('i18n/v1', '/translate', [
        'methods'  => 'GET',
        'callback' => function (WP_REST_Request $request) {
            $key       = sanitize_text_field($request->get_param('key'));
            $variables = (array) $request->get_param('vars');
            return new WP_REST_Response(['value' => i18n_t($key, $variables)], 200);
        },
        'permission_callback' => '__return_true',
    ]);
});
```

---

## Test Commands

```bash
# WP-CLI tests
wp eval 'echo i18n_t("nav.home");'

# PHPUnit (requires WordPress test suite)
phpunit --configuration phpunit.xml

# Local development
wp server   # Start built-in PHP server
```

### PHPUnit Test

```php
<?php

class ShipEasyI18nTest extends WP_UnitTestCase {
    public function setUp(): void {
        parent::setUp();
        update_option('i18n_public_key', 'i18n_pk_test');
        update_option('i18n_profile', 'en:prod');
    }

    public function test_i18n_t_returns_key_on_fetch_failure(): void {
        // ShipEasyI18n fetcher will fail in test environment (no real CDN)
        $result = i18n_t('nav.home');
        $this->assertEquals('nav.home', $result);
    }

    public function test_shortcode_renders_key(): void {
        $result = do_shortcode('[i18n key="nav.home"]');
        $this->assertEquals('nav.home', $result); // fallback in test env
    }

    public function test_head_tags_not_output_without_public_key(): void {
        update_option('i18n_public_key', '');
        ob_start();
        i18n_inject_head_tags();
        $output = ob_get_clean();
        $this->assertEmpty($output);
    }
}
```

---

## End-to-End Example

```
wp-content/
  plugins/
    i18n-for-wordpress/
      i18n-for-wordpress.php     ← main file
      includes/
        class-i18n-fetcher.php
        class-i18n-settings.php
        class-i18n-shortcode.php
        class-i18n-block.php
      assets/js/i18n-block.js    ← built from src/block/index.js
      block.json
      render.php

Setup:
1. Activate plugin
2. Go to Settings → ShipEasyI18n Labels
3. Enter Public Key: i18n_pk_abc123
4. Enter Profile: en:prod
5. Save

Result:
- wp_head injects inline label data + loader.js on every page
- [i18n key="nav.home"] works in posts/pages
- ShipEasyI18n String block available in Gutenberg editor
- i18n_t('key') available in PHP theme templates
```
