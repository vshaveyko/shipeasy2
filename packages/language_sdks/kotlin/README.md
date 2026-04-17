# `shipeasy` — Kotlin SDK (Android + JVM)

One Maven coordinate (`ai.shipeasy:shipeasy`) published as multiple Gradle modules from a single Kotlin Multiplatform (KMP-light) build. Supports Android 7+ (API 24+), JVM server runtimes (Ktor, Spring Boot), and Kotlin/Native CLI usage. Covers both experimentation (flags, configs, experiments, events) and the string manager (i18n labels, runtime locale switching).

- Kotlin ≥ 1.9 (compile target 17)
- Android minSdk 24, targetSdk 34
- `suspend`-first API with `StateFlow`/`LiveData` bridges for Jetpack Compose and XML layouts

---

## Installation

### Gradle (Android)

```kotlin
// app/build.gradle.kts
dependencies {
    implementation("ai.shipeasy:shipeasy-android:1.0.0")
    implementation("ai.shipeasy:shipeasy-compose:1.0.0") // optional, adds @Composable helpers
}
```

### Gradle (JVM server)

```kotlin
dependencies {
    implementation("ai.shipeasy:shipeasy-jvm:1.0.0")
    implementation("ai.shipeasy:shipeasy-ktor:1.0.0") // optional Ktor plugin
}
```

### Maven

```xml
<dependency>
  <groupId>ai.shipeasy</groupId>
  <artifactId>shipeasy-android</artifactId>
  <version>1.0.0</version>
</dependency>
```

---

## Quick start

### Android — app bootstrap

```kotlin
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        ShipeasyClient.configure(
            context = this,
            sdkKey  = BuildConfig.SHIPEASY_CLIENT_KEY,
            baseUrl = "https://api.shipeasy.ai",
        )
        ShipeasyClient.instance.identifyAsync(ShipeasyUser.anonymous())
    }
}
```

### Jetpack Compose

```kotlin
@Composable
fun CheckoutScreen(viewModel: CheckoutViewModel = hiltViewModel()) {
    val newCheckout by rememberShipeasyFlag("new_checkout")
    val experiment  by rememberShipeasyExperiment(
        name = "checkout_button_color",
        defaults = CheckoutParams(color = "gray"),
    )
    val greeting by rememberShipeasyString(
        key = "user.greeting",
        variables = mapOf("name" to "Alice"),
    )

    Column {
        Text(greeting, style = MaterialTheme.typography.headlineMedium)
        if (newCheckout) {
            Button(onClick = viewModel::buy,
                   colors = ButtonDefaults.buttonColors(containerColor = Color(parseColor(experiment.params.color)))) {
                Text("Buy now")
            }
        } else {
            Button(onClick = viewModel::buy) { Text("Buy now (old)") }
        }
    }
}

@Serializable data class CheckoutParams(val color: String)
```

### XML + ViewModel (legacy Android)

```kotlin
@HiltViewModel
class CheckoutViewModel @Inject constructor(
    private val shipeasy: ShipeasyClient,
) : ViewModel() {

    val newCheckout: StateFlow<Boolean> =
        shipeasy.flagFlow("new_checkout").stateIn(viewModelScope, SharingStarted.Eagerly, false)

    val greeting: StateFlow<String> =
        shipeasy.tFlow(key = "user.greeting", variables = mapOf("name" to "Alice"))
            .stateIn(viewModelScope, SharingStarted.Eagerly, "user.greeting")
}
```

### Ktor server

```kotlin
fun Application.module() {
    install(ShipeasyPlugin) {
        apiKey  = environment.config.property("shipeasy.api_key").getString()
        baseUrl = "https://api.shipeasy.ai"
    }

    routing {
        get("/checkout") {
            val user = ShipeasyUser(userId = call.request.header("X-User-ID"))
            if (call.shipeasy.getFlag("new_checkout", user)) {
                call.respondText(call.shipeasy.t("en:prod", "user.greeting",
                    mapOf("name" to "Alice")))
            } else {
                call.respondText("legacy checkout")
            }
        }
    }
}
```

---

## Module map

| Artifact                       | Target        | Purpose                                                                                  |
| ------------------------------ | ------------- | ---------------------------------------------------------------------------------------- |
| `ai.shipeasy:shipeasy-core`    | JVM + Android | Eval, hash, i18n, transport abstractions. No platform APIs.                              |
| `ai.shipeasy:shipeasy-android` | Android       | `ShipeasyClient` with `SharedPreferences`, `ProcessLifecycleOwner`, `WorkManager` flush. |
| `ai.shipeasy:shipeasy-jvm`     | JVM server    | `ShipeasyClient` for Ktor / Spring / plain JVM; no Android deps.                         |
| `ai.shipeasy:shipeasy-compose` | Android       | `rememberShipeasyFlag`, `rememberShipeasyExperiment`, `rememberShipeasyString`.          |
| `ai.shipeasy:shipeasy-ktor`    | JVM           | `ShipeasyPlugin` for Ktor application module.                                            |
| `ai.shipeasy:shipeasy-spring`  | JVM           | Spring Boot auto-configuration — delegates to `shipeasy-jvm`.                            |
| `ai.shipeasy:shipeasy-testing` | All           | `MockShipeasyClient`, coroutine test utilities.                                          |

Consumers install exactly one platform artifact (`-android` or `-jvm`) plus any number of integration artifacts.

---

## Public API

```kotlin
class ShipeasyClient internal constructor(private val impl: ShipeasyImpl) {

    companion object {
        fun configure(context: Context, sdkKey: String, baseUrl: String = DEFAULT_BASE_URL)
        val instance: ShipeasyClient
    }

    suspend fun identify(user: ShipeasyUser)
    fun identifyAsync(user: ShipeasyUser)              // fire-and-forget coroutine

    fun getFlag(name: String, user: ShipeasyUser = currentUser()): Boolean
    fun flagFlow(name: String): Flow<Boolean>

    inline fun <reified T> getConfig(name: String): T?
    fun <T> getExperiment(
        name: String,
        defaults: T,
        decode: (Any?) -> T,
    ): ExperimentResult<T>

    fun track(eventName: String, properties: Map<String, Any?> = emptyMap())
    fun track(userId: String, eventName: String, properties: Map<String, Any?> = emptyMap()) // server overload
    suspend fun flush()

    // i18n
    suspend fun loadLabels(profile: String, chunk: String? = null): LabelBundle
    fun t(key: String, variables: Map<String, Any?> = emptyMap(), profile: String? = null): String
    fun tFlow(key: String, variables: Map<String, Any?> = emptyMap()): Flow<String>
    fun labelUpdateFlow(): Flow<Unit>
}

data class ShipeasyUser(val userId: String? = null, val attributes: Map<String, Any?> = emptyMap()) {
    companion object { fun anonymous() = ShipeasyUser() }
}

data class ExperimentResult<T>(val inExperiment: Boolean, val group: String, val params: T)
```

`kotlinx.serialization` is used for JSON (internally); `getConfig<T>()` / `rememberShipeasyExperiment` reflect on `@Serializable` classes automatically.

---

## Source layout

```
packages/language_sdks/kotlin/
  README.md                          ← this file
  settings.gradle.kts                ← multi-module Gradle build
  build.gradle.kts
  shipeasy-core/
    build.gradle.kts
    src/main/kotlin/ai/shipeasy/core/
      Hash/Murmur3.kt                ← pure Kotlin
      Eval/GateEvaluator.kt
      Eval/ExperimentEvaluator.kt
      Transport/HttpTransport.kt     ← OkHttp (Android & JVM)
      Transport/EventBuffer.kt
      I18n/LabelBundle.kt
      I18n/LabelLoader.kt
  shipeasy-android/
    build.gradle.kts
    src/main/AndroidManifest.xml
    src/main/kotlin/ai/shipeasy/android/
      ShipeasyClient.kt              ← SharedPreferences + ProcessLifecycleOwner
      FlushWorker.kt                 ← WorkManager worker for guaranteed flush
      AndroidStorage.kt
  shipeasy-jvm/
    build.gradle.kts
    src/main/kotlin/ai/shipeasy/jvm/
      ShipeasyClient.kt
  shipeasy-compose/
    build.gradle.kts
    src/main/kotlin/ai/shipeasy/compose/
      RememberFlag.kt
      RememberExperiment.kt
      RememberString.kt
      ShipeasyProvider.kt            ← CompositionLocalProvider
  shipeasy-ktor/
    build.gradle.kts
    src/main/kotlin/ai/shipeasy/ktor/
      ShipeasyPlugin.kt
  shipeasy-spring/
    build.gradle.kts
    src/main/kotlin/ai/shipeasy/spring/
      ShipeasyAutoConfiguration.kt
  shipeasy-testing/
    src/main/kotlin/ai/shipeasy/testing/
      MockShipeasyClient.kt
  tests/
    shipeasy-core-tests/              ← JVM unit tests for eval + hash
    shipeasy-android-tests/           ← Robolectric tests
    shipeasy-compose-tests/           ← Compose UI tests
    shipeasy-integration-tests/       ← hits a live Worker via httpmock
```

Published to Maven Central via the Nexus Publishing plugin. Android AARs include ProGuard/R8 `consumer-rules.pro` so customer proguard doesn't strip SDK classes.

---

## Non-negotiables

- All 5 MurmurHash3 test vectors pass in pure Kotlin. Guava's `Hashing.murmur3_32_fixed` is acceptable **only** on the JVM target; Android avoids it to keep method count low.
- `SharedPreferences` stores the anon ID (not EncryptedSharedPreferences — flags and labels aren't secrets).
- `ProcessLifecycleOwner` flush hook is registered automatically inside `ShipeasyClient.configure(...)` on Android.
- `WorkManager` is used for _guaranteed_ flush on critical events (purchases, signups). The caller opts in via `track(eventName, properties, guaranteed = true)`.
- Coroutines-only — no `Thread.start()`, no `AsyncTask`. Default scope is `SupervisorJob + Dispatchers.IO`, cancellable via `destroy()`.
- Android Compose integration emits `State<T>` that's stable across recompositions; `rememberShipeasyFlag` uses `produceState` with the flag-flow as a key so changes re-trigger emission.
- ProGuard/R8 `consumer-rules.pro` keeps all public classes + `kotlinx.serialization` generated classes.
- Espresso + Compose UI test suites ship in the same release PR as any new property-wrapper helper. Same non-negotiable as [CLAUDE.md](../../../CLAUDE.md).
