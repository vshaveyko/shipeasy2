# Plan: ShipEasyI18n Rails Integration

**Goal**: Provide a Ruby gem (`i18n-rails`) that adds a `i18n_inline_data` view helper for ERB templates so Rails apps can inject label data server-side in the HTML `<head>`, eliminating label flash on first load without requiring any JavaScript framework.
**Package**: `i18n-rails` (Ruby gem, not an npm package)
**Key challenge**: Rails is a traditional server-rendered stack — there is no JavaScript build step, no Relay compiler, no `window.i18n` on the server. The integration must work with any Rails layout (ERB, Haml, Slim) and inject a JSON script tag whose content is fetched from the ShipEasyI18n CDN at render time, with HTTP caching to avoid adding latency to every request.

---

## Install

```ruby
# Gemfile
gem 'i18n-rails'
```

```bash
bundle install
rails generate i18n:install
```

The `i18n:install` generator:

1. Creates `config/initializers/i18n.rb`
2. Adds `<%= i18n_head_tags %>` comment to `app/views/layouts/application.html.erb` (as a hint — user inserts it manually)

---

## Gem Structure

```
i18n-rails/
  lib/
    i18n/
      rails/
        engine.rb           ← Rails::Engine, registers helpers
        configuration.rb    ← ShipEasyI18n.configure { |c| c.key = '...' }
        label_fetcher.rb    ← HTTP client with caching
        view_helpers.rb     ← i18n_inline_data, i18n_script_tag, i18n_head_tags
        railtie.rb          ← auto-loads helpers into ActionView
    i18n-rails.rb            ← require entry point
  bin/
    rails                   ← generator runner
```

---

## Full Source

### `lib/i18n/rails/configuration.rb`

```ruby
module ShipEasyI18n
  class Configuration
    # Public key (i18n_pk_...) — required
    attr_accessor :public_key

    # Profile string, e.g. "en:prod" — required
    attr_accessor :profile

    # Chunk to preload in SSR head — default: "index"
    attr_accessor :default_chunk

    # CDN base URL — default: "https://cdn.i18n.shipeasy.ai"
    attr_accessor :cdn_base_url

    # loader.js URL — default: "https://cdn.i18n.shipeasy.ai/loader.js"
    attr_accessor :loader_url

    # Rails cache TTL for manifest (seconds) — default: 60
    attr_accessor :manifest_cache_ttl

    # Rails cache TTL for label files (seconds) — default: 3600 (immutable)
    attr_accessor :label_file_cache_ttl

    # HTTP timeout for CDN requests (seconds) — default: 1
    attr_accessor :http_timeout

    def initialize
      @default_chunk = "index"
      @cdn_base_url = "https://cdn.i18n.shipeasy.ai"
      @loader_url = "https://cdn.i18n.shipeasy.ai/loader.js"
      @manifest_cache_ttl = 60
      @label_file_cache_ttl = 3600
      @http_timeout = 1
    end
  end

  class << self
    def configuration
      @configuration ||= Configuration.new
    end

    def configure
      yield configuration
    end
  end
end
```

### `config/initializers/i18n.rb` (generated)

```ruby
ShipEasyI18n.configure do |config|
  config.public_key = Rails.application.credentials.dig(:i18n, :public_key) || ENV["ShipEasyI18n_KEY"]
  config.profile    = ENV.fetch("ShipEasyI18n_PROFILE", "en:prod")
  config.default_chunk = "index"
end
```

**Security note**: Store `ShipEasyI18n_KEY` in Rails credentials (`bin/rails credentials:edit`) or as an environment variable. It is a public key (safe to expose in HTML), but keeping it in credentials is good practice.

### `lib/i18n/rails/label_fetcher.rb`

```ruby
require "net/http"
require "uri"
require "json"

module ShipEasyI18n
  module Rails
    class LabelFetcher
      MANIFEST_KEY_PREFIX = "i18n:manifest:"
      LABEL_KEY_PREFIX    = "i18n:label:"

      def initialize(config = ShipEasyI18n.configuration)
        @config = config
      end

      # Fetches the label file for the given profile and chunk.
      # Uses Rails.cache to avoid repeated CDN requests:
      #   - manifest.json: cached for config.manifest_cache_ttl seconds (60s)
      #   - label files: cached for config.label_file_cache_ttl seconds (1h)
      #
      # Returns a Hash with the label file contents, or nil on failure.
      def fetch(profile: @config.profile, chunk: @config.default_chunk)
        manifest = fetch_manifest(profile)
        return nil unless manifest

        file_url = manifest[chunk]
        return nil unless file_url

        fetch_label_file(file_url)
      rescue => e
        ::Rails.logger.warn("[ShipEasyI18n] Failed to fetch labels: #{e.message}")
        nil
      end

      private

      def fetch_manifest(profile)
        cache_key = "#{MANIFEST_KEY_PREFIX}#{@config.public_key}:#{profile}"
        ::Rails.cache.fetch(cache_key, expires_in: @config.manifest_cache_ttl.seconds) do
          url = "#{@config.cdn_base_url}/labels/#{@config.public_key}/#{profile}/manifest.json"
          http_get_json(url)
        end
      end

      def fetch_label_file(url)
        cache_key = "#{LABEL_KEY_PREFIX}#{Digest::MD5.hexdigest(url)}"
        ::Rails.cache.fetch(cache_key, expires_in: @config.label_file_cache_ttl.seconds) do
          http_get_json(url)
        end
      end

      def http_get_json(url)
        uri = URI.parse(url)
        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = (uri.scheme == "https")
        http.open_timeout = @config.http_timeout
        http.read_timeout = @config.http_timeout

        response = http.get(uri.request_uri, { "Accept" => "application/json" })

        unless response.is_a?(Net::HTTPSuccess)
          raise "HTTP #{response.code} fetching #{url}"
        end

        JSON.parse(response.body)
      end
    end
  end
end
```

### `lib/i18n/rails/view_helpers.rb`

```ruby
module ShipEasyI18n
  module Rails
    module ViewHelpers
      # Renders the inline label data script tag and the loader.js script tag.
      # Place both in <head> before your application's JavaScript.
      #
      # @example
      #   # app/views/layouts/application.html.erb
      #   <head>
      #     <%= i18n_head_tags %>
      #   </head>
      #
      # @param profile [String] Override the configured profile (optional)
      # @param chunk [String] Override the configured chunk (optional)
      def i18n_head_tags(profile: nil, chunk: nil)
        safe_join([
          i18n_inline_data(profile: profile, chunk: chunk),
          i18n_script_tag
        ], "\n")
      end

      # Renders <script id="i18n-data" type="application/json">
      # containing the label file JSON.
      # loader.js reads this synchronously on parse so labels are available
      # before any JavaScript executes.
      #
      # @example
      #   <%= i18n_inline_data %>
      #   <%= i18n_inline_data(profile: 'fr:prod', chunk: 'checkout') %>
      def i18n_inline_data(profile: nil, chunk: nil)
        config = ShipEasyI18n.configuration
        resolved_profile = profile || config.profile
        resolved_chunk   = chunk   || config.default_chunk

        label_file = ShipEasyI18n::Rails::LabelFetcher.new.fetch(
          profile: resolved_profile,
          chunk: resolved_chunk
        )

        return "".html_safe unless label_file

        # JSON.generate produces valid JSON — no XSS risk because:
        # 1. label values are developer-controlled (not user input)
        # 2. script type="application/json" is not executable by browsers
        json_content = JSON.generate(label_file)

        content_tag(
          :script,
          json_content.html_safe,
          id: "i18n-data",
          type: "application/json"
        )
      end

      # Renders <script src="https://cdn.i18n.shipeasy.ai/loader.js" data-key="...">
      # loader.js applies labels to elements with data-label attributes.
      #
      # @param hide_until_ready [Boolean] opt-in body:visibility:hidden (default: false)
      def i18n_script_tag(hide_until_ready: false)
        config = ShipEasyI18n.configuration

        attrs = {
          src: config.loader_url,
          "data-key": config.public_key,
          "data-profile": config.profile,
          async: true,
        }
        attrs[:"data-hide-until-ready"] = "true" if hide_until_ready

        tag(:script, attrs)
      end

      # Synchronous server-side translation helper.
      # Fetches labels using the same cache as i18n_inline_data.
      # Useful for translating strings that appear in ERB without data-label
      # (e.g., <title>, meta description).
      #
      # @example
      #   <title><%= i18n_t('page.dashboard.title') %></title>
      #   <meta name="description" content="<%= i18n_t('page.description', name: 'Alice') %>">
      def i18n_t(key, variables = {}, profile: nil, chunk: nil)
        config = ShipEasyI18n.configuration

        label_file = ShipEasyI18n::Rails::LabelFetcher.new.fetch(
          profile: profile || config.profile,
          chunk: chunk || config.default_chunk
        )

        return key unless label_file && label_file["strings"]

        value = label_file["strings"][key] || key

        variables.each do |k, v|
          value = value.gsub("{{#{k}}}", v.to_s)
        end

        value
      end
    end
  end
end
```

### `lib/i18n/rails/railtie.rb`

```ruby
module ShipEasyI18n
  module Rails
    class Railtie < ::Rails::Railtie
      initializer "i18n.view_helpers" do
        ActiveSupport.on_load(:action_view) do
          include ShipEasyI18n::Rails::ViewHelpers
        end
      end
    end
  end
end
```

### `lib/i18n-rails.rb`

```ruby
require "i18n/rails/configuration"
require "i18n/rails/label_fetcher"
require "i18n/rails/view_helpers"
require "i18n/rails/railtie" if defined?(Rails)
```

---

## ERB Usage

### Layout: `app/views/layouts/application.html.erb`

```erb
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><%= i18n_t('page.title') %></title>

  <%# Injects inline label data + loader.js — must come before your JS bundle %>
  <%= i18n_head_tags %>

  <%= csrf_meta_tags %>
  <%= csp_meta_tags %>
  <%= stylesheet_link_tag "application", "data-turbo-track": "reload" %>
  <%= javascript_importmap_tags %>
</head>
<body>
  <%= yield %>
</body>
</html>
```

### Using declarative `data-label` in ERB

```erb
<!-- app/views/dashboard/index.html.erb -->
<h1 data-label="page.dashboard.title">
  <%= i18n_t('page.dashboard.title') %>
</h1>

<span
  data-label="user.greeting"
  data-variables='{"name": "<%= current_user.name.html_safe %>"}'>
  <%= i18n_t('user.greeting', { name: current_user.name }) %>
</span>

<nav>
  <%= link_to i18n_t('nav.home'), root_path,
      data: { label: 'nav.home', label_desc: 'Main navigation home link' } %>
</nav>
```

### Per-page chunk override

```erb
<!-- views/checkout/_checkout_form.html.erb -->
<%# Preload the checkout chunk for this page %>
<%= i18n_inline_data(chunk: 'checkout') %>
```

This adds a second `i18n-data` script tag. loader.js merges multiple script tags.

### Attribute override

```erb
<input
  type="email"
  data-label="form.email.placeholder"
  data-label-attr="placeholder"
  placeholder="<%= i18n_t('form.email.placeholder') %>">
```

The `placeholder` attribute is set server-side by ERB. loader.js also applies it client-side (for Turbo Drive navigation where the page isn't re-rendered from server).

---

## Haml Usage

```haml
!!!
%html{lang: "en"}
  %head
    %meta{charset: "UTF-8"}
    = i18n_head_tags
    = stylesheet_link_tag "application"
  %body
    %h1{"data-label" => "page.title"}
      = i18n_t('page.title')
```

## Slim Usage

```slim
doctype html
html lang="en"
  head
    meta charset="UTF-8"
    = i18n_head_tags
  body
    h1 data-label="page.title" = i18n_t('page.title')
```

---

## Turbo Drive Integration

When using Hotwire/Turbo Drive, full page reloads don't happen on navigation. The DOM is swapped, so MutationObserver in loader.js handles new `data-label` elements automatically.

For Turbo Streams that inject new content:

```js
// app/javascript/application.js
// MutationObserver in loader.js already handles this — no extra code needed.
// loader.js observes document.body with { childList: true, subtree: true }
// so any Turbo Stream content injection is automatically picked up.
```

For Turbo Drive page changes (full `<body>` swap), loader.js re-scans the new body. No action required.

---

## Caching Strategy

### Rails.cache

`LabelFetcher` stores manifest and label files in `Rails.cache`. Configure your cache backend in `config/environments/production.rb`:

```ruby
config.cache_store = :redis_cache_store, { url: ENV["REDIS_URL"] }
```

For apps without Redis, the default `:memory_store` also works (cached per Rails process, cleared on restart).

### Cache key collision

Cache keys include the public key + profile, so multiple ShipEasyI18n customers on the same server don't share cached data.

### Cache warming

On first request after deploy or cache flush, label fetching adds ~50-200ms latency (CDN round-trip). Subsequent requests hit `Rails.cache` instantly.

To pre-warm the cache on boot:

```ruby
# config/initializers/i18n.rb
ShipEasyI18n.configure do |config|
  config.public_key = Rails.application.credentials.dig(:i18n, :public_key)
  config.profile    = "en:prod"
end

# Warm the cache on startup (non-blocking)
if Rails.env.production?
  Thread.new do
    ShipEasyI18n::Rails::LabelFetcher.new.fetch
  rescue => e
    Rails.logger.error("[ShipEasyI18n] Cache warming failed: #{e.message}")
  end
end
```

---

## Edge Cases

### `html_safe` and XSS

`JSON.generate(label_file).html_safe` is safe because:

- Label values come from the ShipEasyI18n CDN (developer-controlled).
- `type="application/json"` scripts are not executed by browsers.
- `JSON.generate` escapes `<`, `>`, `&` as `\u003C`, `\u003E`, `\u0026` by default.

### Content Security Policy

The inline `<script type="application/json">` tag is **not** a JavaScript script — CSP's `script-src` directive does not apply to it. No nonce needed.

The loader.js `<script src="https://cdn.i18n.shipeasy.ai/loader.js">` **is** a JavaScript script. Add the CDN to your CSP:

```ruby
# config/initializers/content_security_policy.rb
Rails.application.config.content_security_policy do |policy|
  policy.script_src :self, "https://cdn.i18n.shipeasy.ai"
  policy.connect_src :self, "https://api.i18n.shipeasy.ai", "https://cdn.i18n.shipeasy.ai"
end
```

### ActionView fragment caching

If the layout is fragment-cached, `i18n_inline_data` may serve stale labels. Avoid caching the `<head>` section, or use the `expires_in: 60.seconds` option when caching:

```erb
<% cache "layout_head", expires_in: 60.seconds do %>
  <%= i18n_head_tags %>
<% end %>
```

### Multi-tenant: per-request profile

For multi-tenant apps where each tenant has a different locale:

```ruby
# app/helpers/application_helper.rb
def i18n_head_tags_for_tenant
  locale = current_tenant&.locale || "en:prod"
  i18n_head_tags(profile: locale)
end
```

```erb
<%= i18n_head_tags_for_tenant %>
```

### Asset pipeline / Propshaft

`i18n-rails` doesn't add any asset pipeline assets. loader.js is loaded from the CDN, not from the asset pipeline. No `//= require` needed.

---

## Generator

```bash
rails generate i18n:install
```

Creates:

```ruby
# config/initializers/i18n.rb
ShipEasyI18n.configure do |config|
  # Public key from i18n_pk_... — get it from app.i18n.shipeasy.ai/keys
  config.public_key = Rails.application.credentials.dig(:i18n, :public_key) ||
                      ENV.fetch("ShipEasyI18n_KEY", nil)

  # Default profile — override per-request if needed
  config.profile = ENV.fetch("ShipEasyI18n_PROFILE", "en:prod")

  # Chunk to preload in every page head
  config.default_chunk = "index"
end
```

And prints instructions to add `<%= i18n_head_tags %>` to the layout.

---

## Test Commands

```bash
bundle exec rake spec          # RSpec
bundle exec rubocop            # Lint
bundle exec rake               # Default: spec + rubocop
```

### RSpec example

```ruby
# spec/helpers/i18n_view_helpers_spec.rb
require "rails_helper"

RSpec.describe ShipEasyI18n::Rails::ViewHelpers, type: :helper do
  before do
    ShipEasyI18n.configure do |c|
      c.public_key = "i18n_pk_test"
      c.profile = "en:prod"
    end
  end

  describe "#i18n_t" do
    it "returns the key as fallback when fetch fails" do
      allow_any_instance_of(ShipEasyI18n::Rails::LabelFetcher).to receive(:fetch).and_return(nil)
      expect(helper.i18n_t("nav.home")).to eq("nav.home")
    end

    it "translates a key from the fetched label file" do
      allow_any_instance_of(ShipEasyI18n::Rails::LabelFetcher).to receive(:fetch).and_return(
        { "strings" => { "nav.home" => "Home" } }
      )
      expect(helper.i18n_t("nav.home")).to eq("Home")
    end

    it "interpolates variables" do
      allow_any_instance_of(ShipEasyI18n::Rails::LabelFetcher).to receive(:fetch).and_return(
        { "strings" => { "user.greeting" => "Hello, {{name}}!" } }
      )
      expect(helper.i18n_t("user.greeting", { name: "Alice" })).to eq("Hello, Alice!")
    end
  end

  describe "#i18n_inline_data" do
    it "renders a script tag with JSON content" do
      allow_any_instance_of(ShipEasyI18n::Rails::LabelFetcher).to receive(:fetch).and_return(
        { "v" => 1, "strings" => { "nav.home" => "Home" } }
      )
      rendered = helper.i18n_inline_data
      expect(rendered).to include('type="application/json"')
      expect(rendered).to include('"nav.home":"Home"')
    end

    it "returns empty string when fetch fails" do
      allow_any_instance_of(ShipEasyI18n::Rails::LabelFetcher).to receive(:fetch).and_return(nil)
      expect(helper.i18n_inline_data).to eq("")
    end
  end
end
```

---

## End-to-End Example

```
my-rails-app/
  Gemfile                           ← gem 'i18n-rails'
  config/
    initializers/
      i18n.rb                        ← ShipEasyI18n.configure { |c| c.public_key = ... }
  app/
    views/
      layouts/
        application.html.erb        ← <%= i18n_head_tags %>
      dashboard/
        index.html.erb              ← <%= i18n_t('page.title') %>, data-label="..."
      shared/
        _nav.html.erb               ← data-label="nav.home"
```
