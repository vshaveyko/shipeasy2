# `shipeasy` — Java SDK

One Maven artifact. Supports Spring Boot 3.x, Jakarta EE, plain Java servlet containers, AWS Lambda, and background workers (Quartz, Spring Scheduling). Covers both experimentation (flags, configs, experiments, events) and the string manager (i18n labels).

- JDK ≥ 17 (Virtual threads supported on 21+)
- Single thread-safe `ShipeasyClient` bean
- Optional Spring Boot auto-configuration — no YAML boilerplate for Spring users

---

## Installation

### Maven

```xml
<dependency>
  <groupId>ai.shipeasy</groupId>
  <artifactId>shipeasy</artifactId>
  <version>1.0.0</version>
</dependency>
```

### Gradle

```groovy
implementation "ai.shipeasy:shipeasy:1.0.0"
```

Spring Boot starter (optional):

```xml
<dependency>
  <groupId>ai.shipeasy</groupId>
  <artifactId>shipeasy-spring-boot-starter</artifactId>
  <version>1.0.0</version>
</dependency>
```

---

## Quick start

### Spring Boot

`application.yml`:

```yaml
shipeasy:
  api-key: ${SHIPEASY_SERVER_KEY}
  base-url: https://api.shipeasy.ai
```

Autowire anywhere:

```java
@RestController
public class CheckoutController {

  private final ShipeasyClient shipeasy;

  public CheckoutController(ShipeasyClient shipeasy) { this.shipeasy = shipeasy; }

  @GetMapping("/checkout")
  public ResponseEntity<Map<String, Object>> checkout(@AuthenticationPrincipal User user) {
    var ctx = Map.of("user_id", user.getId().toString(), "plan", user.getPlan());

    if (!shipeasy.getFlag("new_checkout", ctx)) {
      return ResponseEntity.ok(legacyCheckout());
    }

    ExperimentResult<CheckoutParams> exp = shipeasy.getExperiment(
        "checkout_button_color",
        new CheckoutParams("gray"),
        raw -> {
          @SuppressWarnings("unchecked")
          var m = (Map<String, Object>) raw;
          return new CheckoutParams((String) m.getOrDefault("color", "gray"));
        }
    );

    String greeting = shipeasy.t("en:prod", "user.greeting",
        Map.of("name", user.getFirstName()));

    shipeasy.track(user.getId().toString(), "purchase_completed",
        Map.of("value", /* order total */ 42.0));

    return ResponseEntity.ok(Map.of("color", exp.getParams().color(), "greeting", greeting));
  }
}

record CheckoutParams(String color) {}
```

Graceful shutdown is handled by the starter (`@PreDestroy` on the bean).

### Plain Java / servlet container

```java
ShipeasyClient client = ShipeasyClient.builder()
    .apiKey(System.getenv("SHIPEASY_SERVER_KEY"))
    .baseUrl(URI.create("https://api.shipeasy.ai"))
    .build();

client.init();          // starts scheduled executor + initial fetch
Runtime.getRuntime().addShutdownHook(new Thread(client::destroy));
```

### AWS Lambda

```java
public class Handler implements RequestHandler<Map<String,Object>, String> {
  private static final ShipeasyClient CLIENT = ShipeasyClient.builder()
      .apiKey(System.getenv("SHIPEASY_SERVER_KEY")).build();

  static { CLIENT.initOnce(); }   // fetch once during cold start

  public String handleRequest(Map<String,Object> event, Context ctx) {
    var user = Map.of("user_id", (Object) event.get("userId"));
    return CLIENT.getFlag("feature_x", user) ? "ON" : "OFF";
  }
}
```

---

## Artifact map

| Artifact                                   | Purpose                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| `ai.shipeasy:shipeasy`                     | Core client, eval, transport, hash, i18n.                                     |
| `ai.shipeasy:shipeasy-spring-boot-starter` | Auto-config, `@ConditionalOnClass(ShipeasyClient.class)`, properties binding. |
| `ai.shipeasy:shipeasy-jakarta`             | `jakarta.servlet` filter for non-Spring web apps.                             |
| `ai.shipeasy:shipeasy-micrometer`          | Metrics bridge (fetch latency, event queue depth, ETag hit %).                |
| `ai.shipeasy:shipeasy-testing`             | JUnit 5 extension + in-memory mock client.                                    |

Non-Spring users pull only the core artifact; no Spring classes are referenced.

---

## Public API

```java
public final class ShipeasyClient implements AutoCloseable {

  public static Builder builder();

  public void init();                                    // background poll thread
  public void initOnce();                                // single fetch, no thread
  public void destroy();                                 // alias: close()

  public boolean getFlag(String name, Map<String, Object> user);
  public <T> T getConfig(String name, Decoder<T> decoder);
  public <T> ExperimentResult<T> getExperiment(String name, T defaults, Decoder<T> decoder);

  public void track(String userId, String eventName, Map<String, Object> props);

  // i18n
  public LabelBundle loadLabels(String profile);
  public LabelBundle loadLabels(String profile, String chunk);
  public String t(String profile, String key, Map<String, Object> variables);
}

@FunctionalInterface public interface Decoder<T> {
  T decode(Object raw) throws Exception;
}

public record ExperimentResult<T>(boolean inExperiment, String group, T params) {}
```

`Decoder` is a functional interface so lambda syntax stays clean. `ExperimentResult` is a Java record (JDK 17+).

---

## Source layout

```
packages/language_sdks/java/
  README.md                        ← this file
  pom.xml                          ← parent POM (multi-module)
  shipeasy-core/
    pom.xml
    src/main/java/ai/shipeasy/
      ShipeasyClient.java
      ShipeasyClientBuilder.java
      Config.java
      User.java
      ExperimentResult.java
      Decoder.java
      LabelBundle.java
      internal/
        hash/Murmur3.java
        eval/GateEvaluator.java
        eval/ExperimentEvaluator.java
        transport/HttpTransport.java   ← java.net.http.HttpClient
        transport/EventBuffer.java
        i18n/LabelLoader.java
    src/test/java/ai/shipeasy/
      HashVectorsTest.java
      eval/GateEvaluatorTest.java
      eval/ExperimentEvaluatorTest.java
      i18n/LabelBundleTest.java
      integration/WorkerIntegrationTest.java
  shipeasy-spring-boot-starter/
    pom.xml
    src/main/java/ai/shipeasy/spring/
      ShipeasyAutoConfiguration.java
      ShipeasyProperties.java
      ShipeasyActuatorHealthIndicator.java
  shipeasy-jakarta/
    pom.xml
    src/main/java/ai/shipeasy/jakarta/ShipeasyFilter.java
  shipeasy-micrometer/
    pom.xml
    src/main/java/ai/shipeasy/micrometer/ShipeasyMetrics.java
  shipeasy-testing/
    pom.xml
    src/main/java/ai/shipeasy/test/MockShipeasyClient.java
    src/main/java/ai/shipeasy/test/ShipeasyExtension.java
```

Built and published via Maven with the Central Publishing Plugin. GPG-signed artifacts, sources + javadoc jars.

---

## Non-negotiables

- All 5 MurmurHash3 test vectors pass. No reliance on Guava — a pure-JDK murmur3 implementation ships in `internal/hash/`; Guava is allowed only as a Spring-starter-test-scope alternative for comparison tests.
- Uses `java.net.http.HttpClient` — no Apache HttpClient / OkHttp dependency to keep transitive closure small.
- Background poll uses a `ScheduledExecutorService` with a named daemon thread; `destroy()` calls `shutdownNow()` and waits up to 2s.
- Events are buffered in an `ArrayBlockingQueue` with a drop-oldest policy on overflow; drop count exposed via `shipeasy-micrometer`.
- No Spring classes referenced from `shipeasy-core` — verified by ArchUnit test in CI.
- JDK 17 is the baseline; virtual thread usage (JDK 21+) is opt-in via `Config.useVirtualThreads(true)`.
- Every Spring integration ships with a `@SpringBootTest` that boots against a mock Worker and verifies the `/actuator/health` indicator reports `UP` only after `init()` completes.
