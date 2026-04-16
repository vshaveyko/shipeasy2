# MCP Server — `@flaglab/mcp-server`

Exposes experiment platform capabilities as MCP tools so any AI assistant
(Claude Code, Cursor, Copilot, etc.) can create, configure and implement
experiments through natural conversation.

## Architecture

```
User: "try different button colors for checkout"
      ↓
AI assistant reads skill → calls MCP tools
      ↓
@flaglab/mcp-server (Node.js, stdio transport)
  ├── detect_project()     → reads repo, detects language/framework/SDK
  ├── auth_check()         → checks ~/.flaglab/credentials.json
  ├── create_experiment()  → shells out to `flaglab experiments create`
  ├── get_sdk_snippet()    → returns language-specific code template
  └── implement_in_file()  → reads target file, returns insertion instructions
      ↓
flaglab CLI → Next.js Route Handlers (/api/admin/*) → D1 + KV + CDN purge
```

## Distribution

### As a CLI subcommand (recommended)

The MCP server ships inside the `@flaglab/cli` package as a subcommand.
No separate install needed once the CLI is installed.

```bash
# User adds to their AI config once:
flaglab mcp install   # writes config to ~/.claude/settings.json + ~/.cursor/mcp.json
```

`flaglab mcp` launches `@modelcontextprotocol/sdk` server over stdio.

### Via npx (no prior install)

```json
// ~/.claude/settings.json  or  .cursor/mcp.json  or  mcp.json in project root
{
  "mcpServers": {
    "flaglab": {
      "command": "npx",
      "args": ["-y", "@flaglab/mcp-server@latest"]
    }
  }
}
```

### Via installed CLI

```json
{
  "mcpServers": {
    "flaglab": {
      "command": "flaglab",
      "args": ["mcp"]
    }
  }
}
```

## MCP Server Implementation

```typescript
// packages/mcp-server/src/index.ts
import { Server }              from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport }from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { detectProject }       from './tools/detect.js'
import { authCheck, authLogin }from './tools/auth.js'
import { createGate, createConfig, createExperiment } from './tools/resources.js'
import { getSdkSnippet }       from './tools/snippets.js'
import { experimentStatus }    from './tools/status.js'
import { listResources }       from './tools/list.js'
import { TOOLS }               from './tools/schema.js'

const server = new Server(
  { name: 'flaglab-experiments', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
  const args = params.arguments as Record<string, unknown>
  try {
    switch (params.name) {
      case 'detect_project':      return ok(await detectProject(args))
      case 'auth_check':          return ok(await authCheck())
      case 'auth_login':          return ok(await authLogin())
      case 'create_gate':         return ok(await createGate(args))
      case 'create_config':       return ok(await createConfig(args))
      case 'create_experiment':   return ok(await createExperiment(args))
      case 'get_sdk_snippet':     return ok(await getSdkSnippet(args))
      case 'experiment_status':   return ok(await experimentStatus(args))
      case 'list_resources':      return ok(await listResources(args))
      default: return err(`Unknown tool: ${params.name}`)
    }
  } catch (e: any) {
    return err(e.message)
  }
})

function ok(data: unknown)      { return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] } }
function err(msg: string)       { return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true } }

// Prompts capability — exposes skills so AI assistants that don't support file-based
// skills can load workflow guidance dynamically via MCP protocol
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    { name: 'setup',      description: 'Set up FlagLab SDK in this repo' },
    { name: 'experiment', description: 'Create and implement an experiment or feature flag' },
    { name: 'analyze',    description: 'Analyze experiment results and get a ship/hold verdict' },
    { name: 'cleanup',    description: 'Remove experiment code after shipping the winner' },
  ]
}))

server.setRequestHandler(GetPromptRequestSchema, async ({ params }) => ({
  messages: [{ role: 'user', content: { type: 'text', text: SKILL_CONTENT[params.name] } }]
}))

const transport = new StdioServerTransport()
await server.connect(transport)
```

## Tool Definitions

### `detect_project`

Analyzes the current repo and returns everything the AI needs to know before
generating code or installing the SDK.

```typescript
// tools/detect.ts
import { execSync } from 'child_process'
import { existsSync, readFileSync, realpathSync } from 'fs'
import { join } from 'path'

export interface ProjectInfo {
  language:       'typescript' | 'javascript' | 'python' | 'ruby' | 'go' | 'java' | 'php' | 'unknown'
  frameworks:     string[]          // ['react', 'nextjs', 'express', 'rails', 'django', ...]
  package_manager: string           // npm|yarn|pnpm|pip|poetry|bundler|go|maven|gradle|composer
  sdk_installed:  boolean
  sdk_version:    string | null
  sdk_configured: boolean           // API key + init code present
  config_files:   string[]          // package.json, pyproject.toml, go.mod, etc.
  entry_points:   string[]          // main files, index files
  test_files:     string[]          // detected test files
  template_warning?: string         // set if installed SDK version is outside compatible range
}

export async function detectProject(args: Record<string, unknown>): Promise<ProjectInfo> {
  const requestedPath = (args.path as string) ?? process.cwd()

  // Security: canonicalize path and confirm it stays within the process working directory.
  // realpathSync resolves symlinks so a symlink pointing /tmp/secret → project/link
  // gets caught here rather than silently escaping.
  const cwd        = realpathSync(requestedPath)
  const allowedRoot = realpathSync(process.cwd())
  if (!cwd.startsWith(allowedRoot + path.sep) && cwd !== allowedRoot) {
    throw new Error(`Path traversal rejected: ${requestedPath} resolves to ${cwd} which is outside ${allowedRoot}`)
  }

  // Helper: safely read a file, returning null if it's a symlink pointing outside cwd
  function safeRead(filePath: string): string | null {
    try {
      const resolved = realpathSync(filePath)
      // Must check with path.sep suffix to prevent prefix attacks:
      // cwd=/projects/myapp would wrongly allow /projects/myapp-secrets without the suffix check.
      if (resolved !== cwd && !resolved.startsWith(cwd + path.sep)) {
        console.warn(`[detect_project] Symlink outside project root ignored: ${filePath} → ${resolved}`)
        return null
      }
      return readFileSync(resolved, 'utf8')
    } catch { return null }
  }

  // Use safeRead() instead of readFileSync() everywhere in this function
  // ... rest of detectProject using safeRead instead of readFileSync

  const result: ProjectInfo = {
    language: 'unknown', frameworks: [], package_manager: 'unknown',
    sdk_installed: false, sdk_version: null, sdk_configured: false,
    config_files: [], entry_points: [], test_files: [],
  }

  // Detect language + package manager
  const pkgJson = safeRead(join(cwd, 'package.json'))
  if (pkgJson) {
    const pkg = JSON.parse(pkgJson)
    result.language        = 'typescript'  // assume TS if tsconfig exists, else JS
    result.package_manager = existsSync(join(cwd, 'pnpm-lock.yaml')) ? 'pnpm'
                           : existsSync(join(cwd, 'yarn.lock'))       ? 'yarn' : 'npm'
    if (existsSync(join(cwd, 'tsconfig.json'))) result.language = 'typescript'
    else result.language = 'javascript'

    // Detect frameworks
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    if (deps['next'])              result.frameworks.push('nextjs')
    if (deps['react'])             result.frameworks.push('react')
    if (deps['react-native'])      result.frameworks.push('react-native')
    if (deps['@angular/core'])     result.frameworks.push('angular')
    if (deps['vue'])               result.frameworks.push('vue')
    if (deps['svelte'])            result.frameworks.push('svelte')
    if (deps['express'])           result.frameworks.push('express')
    if (deps['fastify'])           result.frameworks.push('fastify')

    // Detect which SDK variant is installed (framework wrappers include sdk-client transitively)
    const sdkPkg = deps['@flaglab/sdk-react-native'] ?? deps['@flaglab/sdk-vue']
                ?? deps['@flaglab/sdk-svelte']        ?? deps['@flaglab/sdk-angular']
                ?? deps['@flaglab/sdk']               ?? null
    result.sdk_installed = sdkPkg !== null
    result.sdk_version   = sdkPkg

    result.config_files.push('package.json')
  }

  if (existsSync(join(cwd, 'pyproject.toml')) || existsSync(join(cwd, 'requirements.txt'))) {
    result.language        = 'python'
    result.package_manager = existsSync(join(cwd, 'pyproject.toml')) ? 'poetry' : 'pip'
    if (existsSync(join(cwd, 'manage.py')))   result.frameworks.push('django')
    if (existsSync(join(cwd, 'app.py')))      result.frameworks.push('flask')
    // FastAPI, etc. detected from requirements
    result.config_files.push(existsSync(join(cwd, 'pyproject.toml')) ? 'pyproject.toml' : 'requirements.txt')
  }

  if (existsSync(join(cwd, 'Gemfile'))) {
    result.language        = 'ruby'
    result.package_manager = 'bundler'
    if (existsSync(join(cwd, 'config/application.rb'))) result.frameworks.push('rails')
    result.config_files.push('Gemfile')
  }

  if (existsSync(join(cwd, 'go.mod'))) {
    result.language        = 'go'
    result.package_manager = 'go'
    result.config_files.push('go.mod')
  }

  if (existsSync(join(cwd, 'pom.xml'))) {
    result.language        = 'java'
    result.package_manager = 'maven'
    result.config_files.push('pom.xml')
  }

  if (existsSync(join(cwd, 'composer.json'))) {
    result.language        = 'php'
    result.package_manager = 'composer'
    result.config_files.push('composer.json')
  }

  // Check if SDK is configured (API key + init code)
  result.sdk_configured = checkSdkConfigured(cwd, result.language, safeRead)

  return result
}

function checkSdkConfigured(cwd: string, language: string, safeRead: (p: string) => string | null): boolean {
  // Look for FLAGLAB_KEY / FLAGLAB_SERVER_KEY in .env files, or flaglab init call in source
  const envContent = safeRead(join(cwd, '.env'))
  if (envContent?.includes('FLAGLAB_')) return true
  // TODO: grep source files for FlagsClient initialization
  return false
}
```

### `auth_check` / `auth_login`

```typescript
// tools/auth.ts
import { existsSync, readFileSync } from 'fs'
import { join }  from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'

export async function authCheck() {
  const creds = loadCredentials()  // conf library — see packages/cli/src/auth/storage.ts
  if (!creds) return { authenticated: false, project_id: null }
  return { authenticated: true, project_id: creds.project_id }
}

export async function authLogin(): Promise<{ authenticated: boolean; project_id: string | null }> {
  // Shell out to CLI login — opens the browser and polls until complete.
  // Use spawnSync (not execSync) so we avoid fully blocking the MCP server's event loop,
  // but note this still ties up the JS thread for the duration of the poll (up to 5 min).
  // MCP clients should show a "waiting for browser auth…" spinner and not time out early.
  const result = spawnSync('flaglab', ['login'], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error('Login failed or was cancelled')
  return await authCheck()
}
```

### `create_experiment`

```typescript
// tools/resources.ts
import { execFileSync } from 'child_process'

// NEVER use execSync with string interpolation — shell injection risk.
// ALWAYS use execFileSync with argument arrays. No shell interpretation.
// Validate all inputs against allowlist before passing to subprocess.

const SAFE_NAME_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/

// Auto-slug the input before validation — better DX than rejecting natural names
function autoSlug(input: string): string {
  return input
    .replace(/([a-z])([A-Z])/g, '$1_$2')  // camelCase → snake_case
    .replace(/[^a-z0-9_-]/gi, '_')         // replace invalid chars with _
    .replace(/_{2,}/g, '_')                // collapse consecutive underscores
    .replace(/^[^a-z]/i, m => `exp_${m}`) // ensure starts with letter
    .toLowerCase()
    .slice(0, 63)                           // max length
}

function validateName(name: string, label: string): string {
  const slugged = autoSlug(name)
  if (!SAFE_NAME_RE.test(slugged))
    throw new Error(`Cannot create a valid ${label} from "${name}". Please use lowercase letters, digits, hyphens, and underscores.`)
  if (slugged !== name) {
    console.warn(`[MCP] ${label} "${name}" auto-slugged to "${slugged}"`)
  }
  return slugged  // return the validated/slugged name
}

export async function createExperiment(args: Record<string, unknown>) {
  const { name, universe, allocation = 10, groups, params = '{}', targeting_gate, success_event, success_aggregation = 'count_users' } = args as any

  const safeName     = validateName(name, 'experiment name')
  const safeUniverse = validateName(universe, 'universe name')
  const safeTargetingGate = targeting_gate ? validateName(targeting_gate, 'targeting gate name') : undefined
  const safeSuccessEvent  = success_event  ? validateName(success_event, 'event name')           : undefined

  const defaultGroups = groups ?? JSON.stringify([
    { name: 'control', weight: 5000, params: {} },
    { name: 'test',    weight: 5000, params: {} },
  ])

  // execFileSync with argument array — no shell, no injection
  execFileSync('flaglab', [
    'experiments', 'create', safeName,
    '--universe', safeUniverse,
    '--allocation', String(allocation),
    '--groups', defaultGroups,
    '--params', params,
    ...(safeTargetingGate ? ['--targeting-gate', safeTargetingGate] : []),
  ], { stdio: 'pipe' })

  if (safeSuccessEvent) {
    const metricName = `${safeName}_${safeSuccessEvent}`
    try {
      execFileSync('flaglab', ['metrics', 'create', metricName, '--event', safeSuccessEvent, '--aggregation', success_aggregation], { stdio: 'pipe' })
      execFileSync('flaglab', ['experiments', 'metric', 'add', safeName, metricName, '--role', 'goal'], { stdio: 'pipe' })
    } catch { /* metric may already exist */ }
  }

  return { experiment_name: safeName, universe: safeUniverse, allocation, success_event: safeSuccessEvent, status: 'draft' }
}
```

### `get_sdk_snippet`

Returns ready-to-paste code for the detected language and framework — the core of cross-platform support. Templates are derived from the per-language SDK patterns in `12-sdk-reference.md` and co-located in `@flaglab/sdk/templates/` so they version with the SDK (see SDK Template Versioning below).

```typescript
// tools/snippets.ts
export async function getSdkSnippet(args: Record<string, unknown>): Promise<{
  install: string; env_vars: string[]; init: string; usage: string; tracking: string
}> {
  const { language, framework, type, name, params = {}, success_event, success_value } = args as SnippetArgs
  const templates = await loadTemplate(language, detectedSdkPath)
  if (!templates) throw new Error(`No SDK available for language: ${language}. Open a GitHub issue.`)
  return {
    install:  templates.install(framework),
    env_vars: type === 'gate' || type === 'experiment'
              ? ['FLAGLAB_SERVER_KEY (server-side)', 'FLAGLAB_CLIENT_KEY (browser/mobile)']
              : ['FLAGLAB_SERVER_KEY'],
    init:     templates.init(framework),
    usage:    templates.usage(type, name, params, framework),
    tracking: success_event ? templates.tracking(success_event, success_value) : '',
  }
}

// Per-language template snippets are in @flaglab/sdk/templates/ and co-versioned with the SDK.
// See 12-sdk-reference.md for the canonical install/init/usage/tracking patterns per language.
```

## Tool Schema (tools/schema.ts)

```typescript
export const TOOLS = [
  {
    name: 'detect_project',
    description: 'Analyze the current repository to detect language, framework, package manager, and whether the FlagLab SDK is already installed and configured.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Directory to analyze (defaults to cwd)' } },
    },
  },
  {
    name: 'auth_check',
    description: 'Check if the user is authenticated with FlagLab. Returns authenticated status and project_id.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'auth_login',
    description: 'Launch the FlagLab authentication flow. Opens a browser window. Blocks until the user completes login.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_resources',
    description: 'List existing gates, experiments, configs, events and metrics for the authenticated project.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['gates', 'experiments', 'configs', 'events', 'metrics', 'all'] },
      },
    },
  },
  {
    name: 'create_gate',
    description: 'Create a feature gate (on/off flag with optional targeting rules and rollout percentage). Returns the gate object and SDK usage snippet for the detected language.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: {
        name:        { type: 'string', description: 'Snake_case gate name, e.g. new_checkout_button' },
        description: { type: 'string' },
        rollout:     { type: 'number', description: 'Rollout percentage 0-100, default 0 (off)' },
        rules:       { type: 'string', description: 'JSON rules array' },
        language:    { type: 'string', description: 'Target language for code snippet' },
        framework:   { type: 'string' },
      },
    },
  },
  {
    name: 'create_config',
    description: 'Create a global config value (sitevar). No targeting, same value for all users. Returns SDK snippet.',
    inputSchema: {
      type: 'object',
      required: ['name', 'value'],
      properties: {
        name:     { type: 'string' },
        value:    { type: 'string', description: 'JSON-encoded value' },
        language: { type: 'string' },
      },
    },
  },
  {
    name: 'create_experiment',
    description: 'Create an A/B experiment with variants, success metric, and optional targeting. Returns the experiment object and SDK snippet. Does NOT start the experiment — call experiments_start separately.',
    inputSchema: {
      type: 'object',
      required: ['name', 'universe'],
      properties: {
        name:                 { type: 'string', description: 'Snake_case name, e.g. checkout_button_color' },
        description:          { type: 'string', description: 'Human-readable description' },
        universe:             { type: 'string', description: 'Universe name (product area), e.g. checkout' },
        allocation:           { type: 'number', description: 'Percentage of eligible users in experiment, default 10' },
        groups:               { type: 'string', description: 'JSON [{name,weight,params}]. If omitted, creates control/test 50/50.' },
        params:               { type: 'string', description: 'JSON param schema {name: "string"|"bool"|"number"}' },
        targeting_gate:       { type: 'string', description: 'Gate name — only users who pass this gate are eligible' },
        success_event:        { type: 'string', description: 'Event name tracked when success happens, e.g. purchase_completed' },
        success_aggregation:  { type: 'string', enum: ['count_users','count_events','sum','avg','retention_7d','retention_30d'], description: 'How to aggregate the success event, default count_users' },
        language:             { type: 'string' },
        framework:            { type: 'string' },
      },
    },
  },
  {
    name: 'get_sdk_snippet',
    description: 'Get ready-to-paste SDK code for a specific language and framework for a gate, experiment, or config.',
    inputSchema: {
      type: 'object',
      required: ['language', 'type', 'name'],
      properties: {
        language:      { type: 'string', enum: ['typescript','javascript','python','ruby','go','java','php'] },
        framework:     { type: 'string' },
        type:          { type: 'string', enum: ['gate','experiment','config'] },
        name:          { type: 'string' },
        params:        { type: 'object', description: 'Param name → type map' },
        success_event: { type: 'string' },
        success_value: { type: 'boolean', description: 'True if the event carries a numeric value field' },
      },
    },
  },
  {
    name: 'experiment_status',
    description: 'Get current experiment status, results, and verdict (ship/hold/wait).',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
    },
  },
]
```

## SDK Template Versioning

Templates are versioned alongside the SDK. Two mechanisms:

### 1. Co-located templates (primary approach)

Templates live inside the SDK package at `@flaglab/sdk/templates/`. The MCP server
imports templates from the INSTALLED SDK version:

```typescript
// In get_sdk_snippet — import from local installed SDK, not from MCP server bundle
async function loadTemplate(language: string, installedSdkPath: string): Promise<Template> {
  try {
    // Try to load from the project's installed SDK version
    const templatePath = join(installedSdkPath, 'templates', `${language}.js`)
    const { template } = await import(templatePath)
    return template
  } catch {
    // Fallback to bundled templates if SDK doesn't have a templates/ export yet
    return FALLBACK_TEMPLATES[language]
  }
}
```

### 2. Version compatibility check

The MCP server declares compatible SDK versions per language:

```typescript
const COMPATIBLE_VERSIONS: Record<string, string> = {
  typescript: '>=1.0.0 <3.0.0',
  python:     '>=1.0.0',
  ruby:       '>=1.0.0',
  go:         '>=1.0.0',
}

// In detect_project — warn if SDK version is outside compatible range
if (result.sdk_version && !semver.satisfies(result.sdk_version, COMPATIBLE_VERSIONS[language])) {
  result.template_warning = `Installed SDK version ${result.sdk_version} may be incompatible with MCP templates. Run 'npm update @flaglab/sdk'.`
}
```

### 3. Post-insertion validation

After the AI inserts generated code into a file, the MCP tool runs a syntax check:

```typescript
// In get_sdk_snippet result — include a validation command for the AI to run
return {
  ...snippet,
  validate_command: detectValidationCommand(language, framework),
  // e.g.: "npx tsc --noEmit" for TypeScript, "python -m py_compile file.py" for Python
}

function detectValidationCommand(language: string, framework?: string): string {
  if (language === 'typescript') return 'npx tsc --noEmit'
  if (language === 'python')     return 'python -m py_compile'
  if (language === 'ruby')       return 'ruby -c'
  if (language === 'go')         return 'go build ./...'
  return ''
}
```

The MCP skill (11-skills.md) instructs the AI to run this command after insertion
and fix any errors before proceeding to start the experiment.

### First-time setup: project provisioning

When `detect_project()` returns `sdk_configured: false`, `auth_login()` triggers the CLI device flow which provisions the project automatically on first login (see `packages.md` § "What Auth.js Does NOT Handle — Project provisioning").

## Package Structure

```
packages/mcp-server/
  package.json
  src/
    index.ts           — server setup, tool routing
    tools/
      detect.ts        — detect_project
      auth.ts          — auth_check, auth_login
      resources.ts     — create_gate, create_config, create_experiment
      snippets.ts      — get_sdk_snippet + TEMPLATES
      status.ts        — experiment_status
      list.ts          — list_resources
      schema.ts        — TOOLS array (MCP tool definitions)
```

Natural language → tool mapping is in `11-skills.md` § "Skill 2 — Step 3 — Design the experiment".

## Adding `flaglab mcp` to the CLI

In `packages/cli/src/index.ts`:

```typescript
import { Command } from 'commander'
import { spawn }   from 'child_process'

const mcp = new Command('mcp')
  .description('Start the MCP server (for AI assistant integrations)')

mcp
  .command('start')
  .description('Start the MCP server over stdio')
  .action(() => {
    // Re-exec the mcp-server package
    spawn(process.execPath, [require.resolve('@flaglab/mcp-server')], { stdio: 'inherit' })
  })

mcp
  .command('install')
  .description('Add FlagLab MCP server to AI assistant configs')
  .action(async () => {
    await installMcpConfig()
    console.log('✓ Added to ~/.claude/settings.json')
    console.log('✓ Added to .cursor/mcp.json (if Cursor found)')
  })
```

`installMcpConfig()` writes to detected config files:
- `~/.claude/settings.json` (Claude Code)
- `.cursor/mcp.json` (Cursor, project-local)
- `mcp.json` (generic, project root)
