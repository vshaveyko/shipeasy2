// Centralized integration snippets for every entity kind.
//
// One place to teach the user how to read a gate / experiment / config /
// killswitch / translation from each supported SDK. Snippets are intentionally
// short — a single read call plus the surrounding boilerplate the user needs
// to get started. Anything deeper belongs in the docs.

export type IntegrationKind = "gate" | "experiment" | "config" | "killswitch" | "translation";

export type IntegrationLang =
  | "ts"
  | "js"
  | "python"
  | "ruby"
  | "go"
  | "java"
  | "kotlin"
  | "swift"
  | "php"
  | "rust"
  | "curl";

export interface LangSpec {
  id: IntegrationLang;
  label: string;
}

export const ALL_LANGS: LangSpec[] = [
  { id: "ts", label: "TypeScript" },
  { id: "js", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "ruby", label: "Ruby" },
  { id: "go", label: "Go" },
  { id: "java", label: "Java" },
  { id: "kotlin", label: "Kotlin" },
  { id: "swift", label: "Swift" },
  { id: "php", label: "PHP" },
  { id: "rust", label: "Rust" },
  { id: "curl", label: "cURL" },
];

export const KIND_META: Record<
  IntegrationKind,
  { title: string; subtitle: string; nameLabel: string }
> = {
  gate: {
    title: "Integrate this gate",
    subtitle: "Read the gate from any SDK. Returns boolean.",
    nameLabel: "Gate",
  },
  experiment: {
    title: "Integrate this experiment",
    subtitle: "Read the user's variant + params from any SDK.",
    nameLabel: "Experiment",
  },
  config: {
    title: "Integrate this config",
    subtitle: "Read a typed config payload from any SDK.",
    nameLabel: "Config",
  },
  killswitch: {
    title: "Integrate this killswitch",
    subtitle: "Read the kill state and per-switch overrides from any SDK.",
    nameLabel: "Killswitch",
  },
  translation: {
    title: "Use this translation key",
    subtitle: "Render the localized string with the SDK's t() helper.",
    nameLabel: "Key",
  },
};

const q = (s: string) => JSON.stringify(s);

export function snippetFor(kind: IntegrationKind, lang: IntegrationLang, name: string): string {
  switch (kind) {
    case "gate":
      return gateSnippet(lang, name);
    case "experiment":
      return experimentSnippet(lang, name);
    case "config":
      return configSnippet(lang, name);
    case "killswitch":
      return killswitchSnippet(lang, name);
    case "translation":
      return translationSnippet(lang, name);
  }
}

// ── gate ──────────────────────────────────────────────────────────────────

function gateSnippet(lang: IntegrationLang, name: string): string {
  switch (lang) {
    case "ts":
      return `import { shipeasy, flags } from "@shipeasy/sdk/server";

await shipeasy({ apiKey: process.env.SHIPEASY_SERVER_KEY ?? "" });

const enabled = flags.get(${q(name)}, { user_id: "user-123" });
if (enabled) {
  // ship it
}`;
    case "js":
      return `const { shipeasy, flags } = require("@shipeasy/sdk/server");

await shipeasy({ apiKey: process.env.SHIPEASY_SERVER_KEY });

const enabled = flags.get(${q(name)}, { user_id: "user-123" });`;
    case "python":
      return `from shipeasy import Shipeasy

client = Shipeasy(api_key=os.environ["SHIPEASY_SERVER_KEY"])

if client.get_gate(${q(name)}, user_id="user-123"):
    pass`;
    case "ruby":
      return `client = Shipeasy::Client.new(api_key: ENV["SHIPEASY_SERVER_KEY"])

client.gate?(${q(name)}, user_id: "user-123")`;
    case "go":
      return `client := shipeasy.New(shipeasy.Config{APIKey: os.Getenv("SHIPEASY_SERVER_KEY")})

enabled, _ := client.GetGate(${q(name)}, shipeasy.User{ID: "user-123"})`;
    case "java":
      return `Shipeasy client = Shipeasy.builder()
    .apiKey(System.getenv("SHIPEASY_SERVER_KEY"))
    .build();

boolean enabled = client.getGate(${q(name)}, User.of("user-123"));`;
    case "kotlin":
      return `val client = Shipeasy.builder()
    .apiKey(System.getenv("SHIPEASY_SERVER_KEY"))
    .build()

val enabled = client.getGate(${q(name)}, User.of("user-123"))`;
    case "swift":
      return `let client = Shipeasy(apiKey: ProcessInfo.processInfo.environment["SHIPEASY_SERVER_KEY"]!)

let enabled = client.getGate(${q(name)}, userId: "user-123")`;
    case "php":
      return `$client = new Shipeasy\\Client(['api_key' => getenv('SHIPEASY_SERVER_KEY')]);

$enabled = $client->getGate(${q(name)}, ['user_id' => 'user-123']);`;
    case "rust":
      return `let client = shipeasy::Client::new(env::var("SHIPEASY_SERVER_KEY")?);

let enabled = client.get_gate(${q(name)}, &User { id: "user-123".into() }).await?;`;
    case "curl":
      return `curl https://api.shipeasy.ai/sdk/evaluate \\
  -H "Authorization: Bearer $SHIPEASY_SERVER_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"user":{"user_id":"user-123"},"gates":[${q(name)}]}'`;
  }
}

// ── experiment ────────────────────────────────────────────────────────────

function experimentSnippet(lang: IntegrationLang, name: string): string {
  switch (lang) {
    case "ts":
      return `import { shipeasy, flags } from "@shipeasy/sdk/server";

await shipeasy({ apiKey: process.env.SHIPEASY_SERVER_KEY ?? "" });

const result = flags.getExperiment(
  ${q(name)},
  { user_id: "user-123" },
  { /* default params */ },
);

if (result.group === "treatment") {
  // render variant
}`;
    case "js":
      return `const { shipeasy, flags } = require("@shipeasy/sdk/server");

await shipeasy({ apiKey: process.env.SHIPEASY_SERVER_KEY });

const result = flags.getExperiment(${q(name)}, { user_id: "user-123" }, {});`;
    case "python":
      return `from shipeasy import Shipeasy

client = Shipeasy(api_key=os.environ["SHIPEASY_SERVER_KEY"])

assignment = client.get_experiment(${q(name)}, user_id="user-123")
if assignment.group == "treatment":
    ...`;
    case "ruby":
      return `client = Shipeasy::Client.new(api_key: ENV["SHIPEASY_SERVER_KEY"])

assignment = client.get_experiment(${q(name)}, user_id: "user-123")`;
    case "go":
      return `client := shipeasy.New(shipeasy.Config{APIKey: os.Getenv("SHIPEASY_SERVER_KEY")})

assignment, _ := client.GetExperiment(${q(name)}, shipeasy.User{ID: "user-123"})
if assignment.Group == "treatment" { /* … */ }`;
    case "java":
      return `Shipeasy client = Shipeasy.builder()
    .apiKey(System.getenv("SHIPEASY_SERVER_KEY"))
    .build();

ExperimentResult result = client.getExperiment(${q(name)}, User.of("user-123"));`;
    case "kotlin":
      return `val client = Shipeasy.builder()
    .apiKey(System.getenv("SHIPEASY_SERVER_KEY"))
    .build()

val result = client.getExperiment(${q(name)}, User.of("user-123"))`;
    case "swift":
      return `let client = Shipeasy(apiKey: ProcessInfo.processInfo.environment["SHIPEASY_SERVER_KEY"]!)

let result = client.getExperiment(${q(name)}, userId: "user-123")`;
    case "php":
      return `$client = new Shipeasy\\Client(['api_key' => getenv('SHIPEASY_SERVER_KEY')]);

$result = $client->getExperiment(${q(name)}, ['user_id' => 'user-123']);`;
    case "rust":
      return `let client = shipeasy::Client::new(env::var("SHIPEASY_SERVER_KEY")?);

let result = client.get_experiment(${q(name)}, &User { id: "user-123".into() }).await?;`;
    case "curl":
      return `curl https://api.shipeasy.ai/sdk/evaluate \\
  -H "Authorization: Bearer $SHIPEASY_SERVER_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"user":{"user_id":"user-123"},"experiments":[${q(name)}]}'`;
  }
}

// ── config ────────────────────────────────────────────────────────────────

function configSnippet(lang: IntegrationLang, name: string): string {
  switch (lang) {
    case "ts":
      return `import { shipeasy, flags } from "@shipeasy/sdk/server";

await shipeasy({ apiKey: process.env.SHIPEASY_SERVER_KEY ?? "" });

const cfg = flags.getConfig(${q(name)});
// cfg is the JSON payload you set when creating the config`;
    case "js":
      return `const { shipeasy, flags } = require("@shipeasy/sdk/server");

await shipeasy({ apiKey: process.env.SHIPEASY_SERVER_KEY });

const cfg = flags.getConfig(${q(name)});`;
    case "python":
      return `from shipeasy import Shipeasy

client = Shipeasy(api_key=os.environ["SHIPEASY_SERVER_KEY"])

cfg = client.get_config(${q(name)})`;
    case "ruby":
      return `client = Shipeasy::Client.new(api_key: ENV["SHIPEASY_SERVER_KEY"])

cfg = client.get_config(${q(name)})`;
    case "go":
      return `client := shipeasy.New(shipeasy.Config{APIKey: os.Getenv("SHIPEASY_SERVER_KEY")})

cfg, _ := client.GetConfig(ctx, ${q(name)})`;
    case "java":
      return `Shipeasy client = Shipeasy.builder()
    .apiKey(System.getenv("SHIPEASY_SERVER_KEY"))
    .build();

var cfg = client.getConfig(${q(name)});`;
    case "kotlin":
      return `val client = Shipeasy.builder()
    .apiKey(System.getenv("SHIPEASY_SERVER_KEY"))
    .build()

val cfg = client.getConfig(${q(name)})`;
    case "swift":
      return `let client = Shipeasy(apiKey: ProcessInfo.processInfo.environment["SHIPEASY_SERVER_KEY"]!)

let cfg = client.getConfig(${q(name)})`;
    case "php":
      return `$client = new Shipeasy\\Client(['api_key' => getenv('SHIPEASY_SERVER_KEY')]);

$cfg = $client->getConfig(${q(name)});`;
    case "rust":
      return `let client = shipeasy::Client::new(env::var("SHIPEASY_SERVER_KEY")?);

let cfg = client.get_config(${q(name)}).await?;`;
    case "curl":
      return `curl https://api.shipeasy.ai/sdk/config/${name} \\
  -H "Authorization: Bearer $SHIPEASY_SERVER_KEY" \\
  -H "Accept: application/json"`;
  }
}

// ── killswitch ────────────────────────────────────────────────────────────

function killswitchSnippet(lang: IntegrationLang, name: string): string {
  switch (lang) {
    case "ts":
      return `import { shipeasy, getKillswitch, isKilled } from "@shipeasy/sdk/client";

shipeasy({ apiKey: process.env.NEXT_PUBLIC_SHIPEASY_CLIENT_KEY ?? "" });

const payload = getKillswitch(${q(name)}); // { value, switches? }

if (isKilled(${q(name)}, "eu_only")) {
  // disabled for the "eu_only" lane
}`;
    case "js":
      return `const { shipeasy, getKillswitch, isKilled } = require("@shipeasy/sdk/client");

shipeasy({ apiKey: process.env.SHIPEASY_CLIENT_KEY });

const payload = getKillswitch(${q(name)});
if (isKilled(${q(name)}, "eu_only")) {
  // …
}`;
    case "python":
      return `from shipeasy import Shipeasy

client = Shipeasy(api_key=os.environ["SHIPEASY_SERVER_KEY"])

payload = client.get_killswitch(${q(name)})
if client.is_killed(${q(name)}, switch_key="eu_only"):
    pass`;
    case "ruby":
      return `client = Shipeasy::Client.new(api_key: ENV["SHIPEASY_SERVER_KEY"])

payload = client.get_killswitch(${q(name)})
client.killed?(${q(name)}, switch_key: "eu_only")`;
    case "go":
      return `client := shipeasy.New(shipeasy.Config{APIKey: os.Getenv("SHIPEASY_SERVER_KEY")})

payload, _ := client.GetKillswitch(${q(name)})
if client.IsKilled(${q(name)}, "eu_only") {
    // …
}`;
    case "java":
      return `Shipeasy client = Shipeasy.builder()
    .apiKey(System.getenv("SHIPEASY_SERVER_KEY"))
    .build();

Killswitch payload = client.getKillswitch(${q(name)});
boolean killed = client.isKilled(${q(name)}, "eu_only");`;
    case "kotlin":
      return `val client = Shipeasy.builder()
    .apiKey(System.getenv("SHIPEASY_SERVER_KEY"))
    .build()

val payload = client.getKillswitch(${q(name)})
val killed = client.isKilled(${q(name)}, "eu_only")`;
    case "swift":
      return `let client = Shipeasy(apiKey: ProcessInfo.processInfo.environment["SHIPEASY_SERVER_KEY"]!)

let payload = client.getKillswitch(${q(name)})
if client.isKilled(${q(name)}, switchKey: "eu_only") {
    // …
}`;
    case "php":
      return `$client = new Shipeasy\\Client(['api_key' => getenv('SHIPEASY_SERVER_KEY')]);

$payload = $client->getKillswitch(${q(name)});
if ($client->isKilled(${q(name)}, 'eu_only')) {
    // …
}`;
    case "rust":
      return `let client = shipeasy::Client::new(env::var("SHIPEASY_SERVER_KEY")?);

let payload = client.get_killswitch(${q(name)}).await?;
let killed = client.is_killed(${q(name)}, "eu_only").await?;`;
    case "curl":
      return `curl https://api.shipeasy.ai/sdk/killswitch/${name} \\
  -H "Authorization: Bearer $SHIPEASY_SERVER_KEY" \\
  -H "Accept: application/json"`;
  }
}

// ── translation ───────────────────────────────────────────────────────────

function translationSnippet(lang: IntegrationLang, name: string): string {
  switch (lang) {
    case "ts":
      return `import { t } from "@shipeasy/sdk/client";

export function MyComponent() {
  return <h1>{t(${q(name)})}</h1>;
}`;
    case "js":
      return `import { t } from "@shipeasy/sdk/client";

const text = t(${q(name)}); // returns the localized string`;
    case "python":
      return `from shipeasy import Shipeasy

client = Shipeasy(api_key=os.environ["SHIPEASY_SERVER_KEY"])

text = client.t(${q(name)}, locale="en")`;
    case "ruby":
      return `client = Shipeasy::Client.new(api_key: ENV["SHIPEASY_SERVER_KEY"])

text = client.t(${q(name)}, locale: "en")`;
    case "go":
      return `client := shipeasy.New(shipeasy.Config{APIKey: os.Getenv("SHIPEASY_SERVER_KEY")})

text, _ := client.T(ctx, ${q(name)}, "en")`;
    case "java":
      return `Shipeasy client = Shipeasy.builder()
    .apiKey(System.getenv("SHIPEASY_SERVER_KEY"))
    .build();

String text = client.t(${q(name)}, "en");`;
    case "kotlin":
      return `val client = Shipeasy.builder()
    .apiKey(System.getenv("SHIPEASY_SERVER_KEY"))
    .build()

val text = client.t(${q(name)}, "en")`;
    case "swift":
      return `let client = Shipeasy(apiKey: ProcessInfo.processInfo.environment["SHIPEASY_SERVER_KEY"]!)

let text = client.t(${q(name)}, locale: "en")`;
    case "php":
      return `$client = new Shipeasy\\Client(['api_key' => getenv('SHIPEASY_SERVER_KEY')]);

$text = $client->t(${q(name)}, ['locale' => 'en']);`;
    case "rust":
      return `let client = shipeasy::Client::new(env::var("SHIPEASY_SERVER_KEY")?);

let text = client.t(${q(name)}, "en").await?;`;
    case "curl":
      return `curl "https://api.shipeasy.ai/sdk/i18n/${name}?locale=en" \\
  -H "Authorization: Bearer $SHIPEASY_SERVER_KEY"`;
  }
}
