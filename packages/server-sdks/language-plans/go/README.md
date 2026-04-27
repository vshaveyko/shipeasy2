# `shipeasy-go` — Go SDK

One Go module covering long-running HTTP servers (`net/http`, chi, gin, echo, fiber), AWS Lambda, Google Cloud Functions, CLIs, and background workers. Covers both experimentation (flags, configs, experiments, events) and the string manager (i18n labels).

- Go ≥ 1.22
- Zero third-party runtime dependencies beyond the standard library and [`twmb/murmur3`](https://github.com/twmb/murmur3) for the hash
- Context-propagating API — every fetch takes a `context.Context`

---

## Installation

```bash
go get github.com/shipeasy/shipeasy-go
```

```go
import shipeasy "github.com/shipeasy/shipeasy-go"
```

---

## Quick start

### Long-running HTTP server

```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"

    shipeasy "github.com/shipeasy/shipeasy-go"
)

var client *shipeasy.Client

func main() {
    var err error
    client, err = shipeasy.New(shipeasy.Config{
        APIKey:  os.Getenv("SHIPEASY_SERVER_KEY"),
        BaseURL: shipeasy.DefaultBaseURL,
    })
    if err != nil {
        log.Fatalf("shipeasy: %v", err)
    }
    if err := client.Init(context.Background()); err != nil {
        log.Fatalf("shipeasy init: %v", err)
    }

    http.HandleFunc("/checkout", checkoutHandler)
    go http.ListenAndServe(":8080", nil)

    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
    <-quit
    client.Destroy()
}

func checkoutHandler(w http.ResponseWriter, r *http.Request) {
    user := shipeasy.User{
        UserID: r.Header.Get("X-User-ID"),
        Attrs:  map[string]any{"plan": r.Header.Get("X-User-Plan")},
    }

    if !client.GetFlag("new_checkout", user) {
        oldCheckout(w, r); return
    }

    type Params struct{ Color string }
    res, _ := shipeasy.GetExperiment(client, "checkout_button_color",
        Params{Color: "gray"},
        func(raw any) (Params, error) {
            m, _ := raw.(map[string]any)
            c, _ := m["color"].(string)
            if c == "" { c = "gray" }
            return Params{Color: c}, nil
        },
    )

    greeting, _ := client.T(r.Context(), "en:prod", "user.greeting",
        map[string]any{"name": r.Header.Get("X-User-Name")})

    client.Track(user.UserID, "purchase_completed",
        shipeasy.TrackOpts{Value: 42.0})

    newCheckout(w, r, res.Params.Color, greeting)
}
```

### AWS Lambda / Cloud Run Jobs

```go
client, _ := shipeasy.New(shipeasy.Config{APIKey: os.Getenv("SHIPEASY_SERVER_KEY")})
_ = client.InitOnce(ctx)  // no background goroutine

// ... use client, then return; process exits, no Destroy() needed
```

### Gin / chi middleware

```go
import (
    "github.com/gin-gonic/gin"
    "github.com/shipeasy/shipeasy-go/gin"  // sub-package: shipeasygin
)

r := gin.Default()
r.Use(shipeasygin.Middleware(client, shipeasygin.UserFunc(func(c *gin.Context) shipeasy.User {
    return shipeasy.User{UserID: c.GetString("user_id")}
})))
```

`c.MustGet("shipeasy").(shipeasy.RequestCtx)` now yields per-request helpers.

---

## Sub-package map

| Import                                         | Purpose                                        |
| ---------------------------------------------- | ---------------------------------------------- |
| `github.com/shipeasy/shipeasy-go`              | Core `Client`, `Config`, `User`, `Track`, `T`. |
| `github.com/shipeasy/shipeasy-go/gin`          | Gin middleware + context helpers.              |
| `github.com/shipeasy/shipeasy-go/chi`          | chi middleware.                                |
| `github.com/shipeasy/shipeasy-go/echo`         | labstack/echo middleware.                      |
| `github.com/shipeasy/shipeasy-go/fiber`        | gofiber middleware.                            |
| `github.com/shipeasy/shipeasy-go/lambda`       | AWS Lambda wrapper (`InitOnce` + context).     |
| `github.com/shipeasy/shipeasy-go/shipeasytest` | `mockClient` for unit tests.                   |

Sub-packages are tiny (~100–300 lines each) and only imported when referenced.

---

## Public API

```go
type Config struct {
    APIKey          string
    BaseURL         string        // default "https://api.shipeasy.ai"
    PollInterval    time.Duration // overrides server's X-Poll-Interval
    HTTPClient      *http.Client  // inject for retries/tracing
    Logger          *slog.Logger  // default: discard
}

func New(cfg Config) (*Client, error)

func (c *Client) Init(ctx context.Context) error
func (c *Client) InitOnce(ctx context.Context) error
func (c *Client) Destroy()

func (c *Client) GetFlag(name string, u User) bool
func (c *Client) GetConfig(name string, decode func(any) (any, error)) (any, error)

// Generic helper (package-level because methods can't have type params):
func GetExperiment[T any](c *Client, name string, defaults T, decode func(any) (T, error)) (ExperimentResult[T], error)
func GetConfigTyped[T any](c *Client, name string, decode func(any) (T, error)) (T, error)

type User struct {
    UserID string
    Attrs  map[string]any
}

type ExperimentResult[T any] struct {
    InExperiment bool
    Group        string
    Params       T
}

func (c *Client) Track(userID, eventName string, opts TrackOpts)

// i18n
func (c *Client) LoadLabels(ctx context.Context, profile, chunk string) (*LabelBundle, error)
func (c *Client) T(ctx context.Context, profile, key string, vars map[string]any) (string, error)
func (b *LabelBundle) T(key string, vars map[string]any) string
```

---

## Source layout

```
packages/language_sdks/go/
  README.md                    ← this file
  go.mod
  go.sum
  shipeasy.go                  ← package shipeasy: exported Client, Config, User
  client.go
  hash.go                      ← wraps twmb/murmur3 with UTF-8 guard
  eval_gate.go
  eval_experiment.go
  transport.go                 ← http.Client + ETag + retry
  events.go                    ← /collect fire-and-forget goroutine
  i18n.go                      ← LabelBundle, interpolation
  loader.go                    ← manifest + chunk fetch
  gin/
    middleware.go
  chi/
    middleware.go
  echo/
    middleware.go
  fiber/
    middleware.go
  lambda/
    handler.go
  shipeasytest/
    mock.go
  internal/
    ratelimit.go
    jitter.go
  hash_vectors_test.go         ← 5 cross-language vectors
  eval_gate_test.go
  eval_experiment_test.go
  i18n_test.go
  integration_test.go          ← hits a real Worker via httptest
```

Multi-Go-version CI (1.22, 1.23). Module path `github.com/shipeasy/shipeasy-go` (repo) with sub-modules under versioned paths for framework middleware.

---

## Non-negotiables

- No `panic` in hot paths — `GetFlag` / `GetConfig` / `T` never panic even on malformed server data.
- `context.Context` threaded through every network call. `Init`, `InitOnce`, `LoadLabels`, and `T` all accept a context; cancelled contexts abort cleanly.
- Goroutine lifecycle: `Init` spawns exactly two goroutines (poll + event flush); `Destroy` joins both via `chan struct{}`.
- All 5 MurmurHash3 vectors pass (`hash_vectors_test.go`). `twmb/murmur3` is the chosen implementation — its seed-0 output matches the JS SDK byte-for-byte.
- `slog` for structured logs; default logger discards. Never log the SDK key — only its `sdk_server_…` prefix.
- `go vet` + `golangci-lint` clean. `go test -race` clean.
