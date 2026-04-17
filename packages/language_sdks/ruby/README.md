# `shipeasy` — Ruby SDK

One RubyGem. Supports Rails 7+, Sinatra, Rack-based apps, Sidekiq/ActiveJob workers, and plain Ruby scripts. Covers both experimentation (flags, configs, experiments, events) and the string manager (i18n labels, profile switching).

- Ruby ≥ 3.1
- Module-level singleton with a thread-safe HTTP client
- Daemon background thread for long-running servers; `init_once!` for one-shot runtimes

---

## Installation

```ruby
# Gemfile
gem "shipeasy"
```

```bash
bundle install
```

Rails apps get auto-wired via the included Railtie. Non-Rails apps require one `Shipeasy.configure` call at boot.

---

## Quick start

### Rails

`config/initializers/shipeasy.rb`:

```ruby
Shipeasy.configure do |c|
  c.api_key  = ENV.fetch("SHIPEASY_SERVER_KEY")
  c.base_url = ENV.fetch("SHIPEASY_BASE_URL", "https://api.shipeasy.ai")
end

Shipeasy.client.init!   # starts daemon thread
at_exit { Shipeasy.client.destroy! }
```

Controllers get `shipeasy_user` + `shipeasy_flag?` helpers via the Railtie:

```ruby
class CheckoutController < ApplicationController
  def show
    if shipeasy_flag?("new_checkout")
      render :new and return
    end

    result = Shipeasy.client.get_experiment(
      "checkout_button_color",
      default_params: { color: "gray" },
      decode: ->(raw) { { color: raw.fetch("color", "gray") } },
    )

    Shipeasy.client.track(current_user.id.to_s, "purchase_completed", value: @order.total)

    render :show, locals: { color: result.params[:color],
                             greeting: shipeasy_t("user.greeting", name: current_user.first_name) }
  end
end
```

View helper:

```erb
<h1><%= shipeasy_t "user.greeting", name: current_user.first_name %></h1>
```

### Sinatra / Rack

```ruby
require "shipeasy"

Shipeasy.configure { |c| c.api_key = ENV["SHIPEASY_SERVER_KEY"] }
Shipeasy.client.init!

use Shipeasy::Rack::Middleware, user_proc: ->(env) {
  { user_id: env["rack.session"][:user_id].to_s }
}
```

### Sidekiq / ActiveJob

Background workers share the main process singleton — no per-job init needed. For forking servers (Puma clustered, Resque), init inside the child:

```ruby
Puma::Plugin.on_worker_boot { Shipeasy.client.init! }
```

---

## Sub-entry-point map

| Require            | Purpose                                                         |
| ------------------ | --------------------------------------------------------------- |
| `shipeasy`         | Top-level `Shipeasy::Client`, `Shipeasy.configure`, `.client`.  |
| `shipeasy/rails`   | Railtie — controller/view helpers, eager init, migration hooks. |
| `shipeasy/rack`    | Rack middleware for non-Rails apps.                             |
| `shipeasy/sidekiq` | Sidekiq server middleware, identifies user from job args.       |
| `shipeasy/testing` | RSpec / Minitest helpers, in-memory mock client.                |

The Railtie is only loaded when Rails is present — pure-Ruby apps don't pay for it.

---

## Public API

```ruby
# Client
Shipeasy.client.init!                  # daemon thread + initial fetch
Shipeasy.client.init_once!             # one-shot (serverless)
Shipeasy.client.destroy!

# Evaluation
Shipeasy.client.get_flag(name, user)              # => true / false
Shipeasy.client.get_config(name, decoder)         # decoder is a proc or class
Shipeasy.client.get_experiment(name, default_params:, decode:)
# => #<Shipeasy::ExperimentResult in_experiment: true, group: "test", params: {...}>

# Events
Shipeasy.client.track(user_id, event_name, value: nil, **props)

# i18n
bundle = Shipeasy.client.load_labels("en:prod", chunk: "index")
bundle.t("user.greeting", name: "Alice")
# Or shortcut:
Shipeasy.client.t("user.greeting", { name: "Alice" }, profile: "en:prod")
```

---

## Source layout

```
packages/language_sdks/ruby/
  README.md                         ← this file
  shipeasy.gemspec
  lib/
    shipeasy.rb                     ← top-level public API
    shipeasy/
      client.rb                     ← Shipeasy::Client singleton
      configuration.rb
      hash.rb                       ← MurmurHash3_x86_32 (pure Ruby)
      eval/
        gate.rb
        experiment.rb
      transport/
        http.rb                     ← Net::HTTP::Persistent + ETag + retry
        events.rb                   ← /collect worker thread
      i18n/
        bundle.rb
        loader.rb
      rails/
        railtie.rb
        controller_helpers.rb
        view_helpers.rb
      rack/middleware.rb
      sidekiq/middleware.rb
      testing/
        mock_client.rb
        rspec.rb
  spec/
    hash_vectors_spec.rb            ← 5 cross-language vectors
    eval/gate_spec.rb
    eval/experiment_spec.rb
    i18n/bundle_spec.rb
    rails/integration_spec.rb
```

Published to RubyGems as `shipeasy`. Supports Ruby 3.1 / 3.2 / 3.3 via GitHub Actions matrix.

---

## Non-negotiables

- All 5 MurmurHash3 test vectors pass in pure Ruby (no C extension dependency).
- Background poll thread is marked `Thread.new { ... }.tap { |t| t.report_on_exception = true }` — errors are logged, never crash the web process.
- Event delivery goes through a bounded `SizedQueue` with a drop-on-full policy — event loss is logged but never backpressures the request.
- Forking servers (Puma clustered, Unicorn) MUST re-init in the child; the Railtie auto-installs a `Puma::Plugin` hook.
- Rails view helper output is HTML-safe by default; `shipeasy_t` returns a frozen HTML-safe string.
- Playwright e2e for any Rails view exposing `shipeasy_t` or `shipeasy_flag?` — same rule as [CLAUDE.md](../../../CLAUDE.md).
