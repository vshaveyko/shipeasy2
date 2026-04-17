# shipeasy-sdk

Ruby SDK for the ShipEasy experiment platform. Evaluates feature flags and A/B experiments locally against blobs polled from the ShipEasy edge worker.

## Installation

```ruby
# Gemfile
gem "shipeasy-sdk"
```

## Quick start

```ruby
require "shipeasy-sdk"

client = Shipeasy::SDK.new_client(api_key: "sdk_live_xxxxx")
client.init   # fetches flags/experiments + starts background polling thread

user = { user_id: "usr_123", plan: "pro", country: "US" }

# Feature flag
if client.get_flag("new_checkout", user)
  # show new checkout
end

# Remote config
color = client.get_config("button_color")   # => "blue" (raw value)

# A/B experiment
result = client.get_experiment("checkout_cta", user, { label: "Buy now" })
puts result.in_experiment  # true/false
puts result.group          # "control" | "treatment"
puts result.params         # { "label" => "Checkout" }

# Track a metric event (fire-and-forget background thread)
client.track("usr_123", "checkout_completed", { revenue: 49.99 })

# Shutdown (stops background poll thread)
client.destroy
```

## init vs init_once

- `init` — fetches data, marks initialized, starts the background poll thread. Call once at app boot.
- `init_once` — same as `init` but is a no-op if already initialized. Safe to call multiple times (e.g. in middleware).

## Evaluation details

- **Gates** — rules matched in order; rollout bucket computed as `murmur3("#{salt}:#{uid}") % 10000 < rolloutPct`.
- **Experiments** — checks `status == "running"`, optional targeting gate, universe holdout range, allocation bucket, then group assignment by weight.
- **MurmurHash3** — pure Ruby implementation, x86_32 variant, seed 0.
- **ETag caching** — each poll sends `If-None-Match`; a `304` response skips the JSON parse.
- **Poll interval** — initial default 30 s; overridden by `X-Poll-Interval` response header from the flags endpoint.

## Configuration

| Parameter  | Default                     | Description                         |
| ---------- | --------------------------- | ----------------------------------- |
| `api_key`  | (required)                  | SDK key from the ShipEasy dashboard |
| `base_url` | `https://edge.shipeasy.dev` | Override for local dev / staging    |
