# i18n-rails

Rails view helpers for ShipEasy i18n CDN integration. Injects label data inline and loads the ShipEasy i18n loader script.

## Installation

```ruby
# Gemfile
gem "i18n-rails"
```

## Configuration

```ruby
# config/initializers/shipeasy_i18n.rb
ShipEasyI18n.configure do |config|
  config.public_key           = "pk_live_xxxxx"
  config.profile              = "en-US"
  config.default_chunk        = "index"
  config.cdn_base_url         = "https://cdn.i18n.shipeasy.ai"
  config.loader_url           = "https://cdn.i18n.shipeasy.ai/loader.js"
  config.manifest_cache_ttl   = 60     # seconds (uses Rails.cache)
  config.label_file_cache_ttl = 3600   # seconds
  config.http_timeout         = 1      # seconds (connect + read)
end
```

## View helpers

### `i18n_head_tags`

Renders both the inline data block and the loader script tag. Place in `<head>`.

```erb
<head>
  <%= i18n_head_tags %>
</head>
```

Override profile or chunk per-request:

```erb
<%= i18n_head_tags(profile: "fr-FR", chunk: "checkout") %>
```

### `i18n_inline_data`

Renders only the `<script type="application/json" id="i18n-data">` block with the fetched label file contents.

```erb
<%= i18n_inline_data %>
```

### `i18n_script_tag`

Renders only the async loader `<script>` tag.

```erb
<%= i18n_script_tag %>
<%= i18n_script_tag(hide_until_ready: true) %>
```

### `i18n_t`

Server-side string lookup with optional variable interpolation. Falls back to the key if the string is not found.

```erb
<%= i18n_t("welcome.title") %>
<%= i18n_t("welcome.greeting", name: current_user.name) %>
```

## Caching

Label manifests and label files are cached via `Rails.cache` using the configured TTLs. If `Rails.cache` is not available the helpers fall through to a live HTTP fetch on every request.

## Auto-loading

The gem ships a Railtie that automatically includes `ShipEasyI18n::Rails::ViewHelpers` into ActionView when Rails is present — no manual `include` required.
