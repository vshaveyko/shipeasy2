# `Shipeasy` — Swift SDK (iOS, macOS, tvOS, visionOS)

One Swift package. Supports SwiftUI, UIKit, AppKit, command-line Swift, and server-side Swift (Vapor). Covers both experimentation (flags, configs, experiments, events) and the string manager (i18n labels, runtime locale switching).

- Swift tools ≥ 5.9
- iOS 15+, macOS 12+, tvOS 15+, watchOS 8+, visionOS 1+
- Thread-safe `actor`-backed client with Combine + `async/await` APIs
- `URLSession`-only transport — no third-party HTTP dependency

---

## Installation

### Swift Package Manager (preferred)

Xcode → File → Add Package Dependency → `https://github.com/shipeasy/shipeasy-swift`

Or in `Package.swift`:

```swift
dependencies: [
  .package(url: "https://github.com/shipeasy/shipeasy-swift", from: "1.0.0"),
],
targets: [
  .target(name: "MyApp", dependencies: [
    .product(name: "Shipeasy", package: "shipeasy-swift"),
    .product(name: "ShipeasySwiftUI", package: "shipeasy-swift"), // optional
  ]),
]
```

### CocoaPods (fallback)

```ruby
pod 'Shipeasy', '~> 1.0'
```

---

## Quick start

### SwiftUI

```swift
import SwiftUI
import Shipeasy
import ShipeasySwiftUI

@main
struct MyApp: App {
    init() {
        ShipeasyClient.configure(
            sdkKey: Bundle.main.object(forInfoDictionaryKey: "SHIPEASY_CLIENT_KEY") as! String,
            baseURL: URL(string: "https://api.shipeasy.ai")!
        )
        Task { await ShipeasyClient.shared.identify(ShipeasyUser.anonymous) }
    }

    var body: some Scene {
        WindowGroup { RootView() }
    }
}

struct CheckoutView: View {
    @ShipeasyFlag("new_checkout")  private var newCheckout
    @ShipeasyExperiment("checkout_button_color", default: CheckoutParams(color: "gray"))
        private var checkoutExp
    @ShipeasyString("user.greeting", variables: ["name": "Alice"])
        private var greeting

    var body: some View {
        VStack {
            Text(greeting).font(.title)
            if newCheckout {
                Button("Buy now") { }
                    .tint(Color(checkoutExp.params.color))
            } else {
                Button("Buy now (old)") { }
            }
        }
        .onAppear { ShipeasyClient.shared.track("checkout_viewed") }
    }
}

struct CheckoutParams: Decodable { let color: String }
```

Property wrappers (`@ShipeasyFlag`, `@ShipeasyExperiment`, `@ShipeasyString`) re-publish when `identify()` resolves or the editor live-updates labels — no manual `onReceive` needed.

### UIKit

```swift
import Shipeasy
import ShipeasyUIKit

class CheckoutViewController: UIViewController {

    private var cancellables = Set<AnyCancellable>()

    override func viewDidLoad() {
        super.viewDidLoad()

        ShipeasyClient.shared.flagPublisher("new_checkout")
            .receive(on: RunLoop.main)
            .sink { [weak self] enabled in self?.toggle(enabled: enabled) }
            .store(in: &cancellables)

        greetingLabel.shipeasy(key: "user.greeting", variables: ["name": "Alice"])
    }
}
```

### Vapor (server-side Swift)

```swift
import Vapor
import Shipeasy

func configure(_ app: Application) async throws {
    app.shipeasy = try await ShipeasyServerClient(
        apiKey: Environment.get("SHIPEASY_SERVER_KEY")!,
        baseURL: URL(string: "https://api.shipeasy.ai")!
    )
    try await app.shipeasy.init()
}

app.get("checkout") { req -> Response in
    let user = ShipeasyUser(userID: req.headers["x-user-id"].first)
    if await req.application.shipeasy.getFlag("new_checkout", user: user) { ... }
}
```

---

## Product map

| SwiftPM product   | Targets                                    | Purpose                                                                                                 |
| ----------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `Shipeasy`        | iOS, macOS, tvOS, watchOS, visionOS, Linux | Core `ShipeasyClient`, eval, hash, transport, i18n.                                                     |
| `ShipeasySwiftUI` | Apple platforms                            | `@ShipeasyFlag`, `@ShipeasyExperiment`, `@ShipeasyString` property wrappers; `ObservableObject` bridge. |
| `ShipeasyUIKit`   | iOS, tvOS                                  | `UILabel.shipeasy(key:)`, `UIViewController` extensions, Combine publishers.                            |
| `ShipeasyAppKit`  | macOS                                      | `NSTextField.shipeasy(key:)`, `NSViewController` extensions.                                            |
| `ShipeasyServer`  | Linux, Apple platforms                     | `ShipeasyServerClient` with `init`/`destroy` for long-running Vapor/Hummingbird apps.                   |
| `ShipeasyTesting` | All platforms                              | `MockShipeasyClient`, XCTest helpers.                                                                   |

Importing only `Shipeasy` does not pull in SwiftUI or UIKit — SwiftPM conditional compilation keeps binaries small.

---

## Public API

```swift
public actor ShipeasyClient {

    public static let shared: ShipeasyClient

    public static func configure(sdkKey: String,
                                 baseURL: URL,
                                 configuration: Configuration = .default)

    public func identify(_ user: ShipeasyUser) async
    public func track(_ eventName: String, properties: [String: Any] = [:])
    public func flush() async

    public nonisolated func getFlag(_ name: String) -> Bool

    public nonisolated func getExperiment<T: Decodable>(
        _ name: String, default: T, as: T.Type = T.self
    ) -> ExperimentResult<T>

    public nonisolated func getConfig<T: Decodable>(
        _ name: String, as: T.Type
    ) -> T?

    public nonisolated func t(_ key: String,
                              variables: [String: Any] = [:],
                              profile: String? = nil) -> String

    public nonisolated var resultPublisher: AnyPublisher<ShipeasyResult, Never> { get }
    public nonisolated var labelUpdatePublisher: AnyPublisher<Void, Never> { get }
}

public struct ShipeasyUser {
    public var userID: String?
    public var attributes: [String: any Hashable & Sendable]
    public static let anonymous = ShipeasyUser()
}

public struct ExperimentResult<T> {
    public let inExperiment: Bool
    public let group: String
    public let params: T
}
```

The actor owns mutable state; `nonisolated` getters read from an atomic snapshot that's swapped on each `identify`/label-update so synchronous call sites in SwiftUI's view body stay safe.

---

## Source layout

```
packages/language_sdks/swift/
  README.md                          ← this file
  Package.swift
  Sources/
    Shipeasy/
      ShipeasyClient.swift
      Configuration.swift
      ShipeasyUser.swift
      ExperimentResult.swift
      Internal/
        Hash/Murmur3.swift           ← pure Swift, UTF-8 bytes
        Eval/GateEvaluator.swift
        Eval/ExperimentEvaluator.swift
        Transport/HTTPClient.swift   ← URLSession + ETag
        Transport/EventBuffer.swift  ← beginBackgroundTask wrapper
        I18n/LabelBundle.swift
        I18n/LabelLoader.swift
    ShipeasySwiftUI/
      ShipeasyFlag.swift             ← @propertyWrapper
      ShipeasyExperiment.swift
      ShipeasyString.swift
      EnvironmentValues+Shipeasy.swift
    ShipeasyUIKit/
      UILabel+Shipeasy.swift
      UIViewController+Shipeasy.swift
    ShipeasyAppKit/
      NSTextField+Shipeasy.swift
    ShipeasyServer/
      ShipeasyServerClient.swift
    ShipeasyTesting/
      MockShipeasyClient.swift
  Tests/
    ShipeasyTests/
      HashVectorsTests.swift         ← 5 cross-language vectors, incl. "Hello, 世界" → 0x3C4FCDA4
      EvalGateTests.swift
      EvalExperimentTests.swift
      I18nTests.swift
    ShipeasySwiftUITests/
      PropertyWrapperTests.swift
    ShipeasyIntegrationTests/
      WorkerIntegrationTests.swift   ← hits a real Worker via test env
```

`swift test` runs on macOS + Linux in CI. iOS/tvOS/visionOS runs via `xcodebuild -scheme Shipeasy -destination`.

---

## Non-negotiables

- All 5 MurmurHash3 vectors pass, **including** the UTF-8 multi-byte vector (`"Hello, 世界" → 0x3C4FCDA4`). Hash always operates on `String.utf8` bytes, never Swift's Unicode scalars.
- `UserDefaults` stores the anon ID — **not** Keychain (flags and labels are not secrets).
- `URLSession.shared.dataTask` wrapped in `UIApplication.beginBackgroundTask` for event flush on `UIApplication.didEnterBackgroundNotification` (iOS/tvOS).
- Combine publishers and `async/await` APIs both available; no either/or.
- `getFlag` and `t` are **synchronous** and safe to call from SwiftUI view `body` — they read from an atomic snapshot, never await.
- Minimum deployment target stays iOS 15 / macOS 12 to support `URLSession` async/await and Combine without polyfills.
- Every SwiftUI property wrapper ships with an XCUITest that boots a sample SwiftUI app and asserts the view updates after `identify()` completes.
