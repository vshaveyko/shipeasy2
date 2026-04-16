# AI Skills — `experiment-platform`

Skills are markdown files that tell AI assistants HOW to use the MCP tools.
They trigger on natural language patterns and guide the AI through a structured workflow.

## Skill Distribution

Skills ship as a directory at a public URL or bundled with the MCP server.
Users add them once:

```bash
flaglab mcp install   # installs MCP server config + skill references
```

Claude Code skill path: `~/.claude/skills/experiment-platform/`
MCP servers can also expose skills via the `prompts` capability (MCP 0.6+).

---

## Skill 1: `experiment-platform:setup`

**Trigger:** user mentions "set up experiments", "add feature flags", "install flaglab",
or `detect_project` reveals SDK not installed/configured on first run of any other skill.

```markdown
# experiment-platform:setup

You are setting up the FlagLab feature flag and experimentation platform in this repository.

## Step 1 — Check auth
Call `auth_check`. If not authenticated, call `auth_login` and wait for it to complete.

## Step 2 — Detect project
Call `detect_project`. Note the language, framework, and package manager.

## Step 3 — Install SDK (if not installed)
Based on detected language, provide the install command from `get_sdk_snippet`.
Use the Edit tool to add the dependency, then run the install command.

## Step 4 — Add env vars
Tell the user they need two keys from https://app.yourdomain.com/settings/keys:
- `FLAGLAB_SERVER_KEY` — for backend/server-side evaluation
- `FLAGLAB_CLIENT_KEY` — for browser/mobile client-side evaluation (public, safe to expose)
Add them to .env (and .env.example without values). Never commit the actual keys.

## Step 5 — Add initialization code
Based on detected language + framework, generate the init snippet from `get_sdk_snippet`
and add it to the appropriate file:
- Next.js: `lib/flaglab.ts` + import in `app/layout.tsx`
- Rails: `config/initializers/flaglab.rb`
- Django: `settings.py` or `apps.py`
- Express: `app.js` or `server.ts`
- Go: package-level var with `init()` function

## Step 6 — Verify
Run the project's existing test command to confirm nothing broke.
Report: SDK installed ✓, env vars added ✓, init code added ✓.
```

---

## Skill 2: `experiment-platform:experiment`

**Trigger:** Any of:
- "set up experiment to check X"
- "try different X for Y"
- "A/B test [anything]"
- "feature flag [feature]"
- "roll out [feature] to N%"
- "generate ideas to improve [metric]"
- "what experiments could help with [goal]"
- "test if [hypothesis]"

```markdown
# experiment-platform:experiment

## Determine intent

First classify what the user wants:

A) **Single experiment/flag** — clear hypothesis, one thing to test
B) **Brainstorm** — "generate ideas", "what could improve", "suggest experiments"
C) **Config change** — setting a global value, no targeting needed

### For (C) Config: skip to Step 4c.

### For (B) Brainstorm:
1. Call `detect_project` to understand the codebase
2. Ask the user: "What's the metric you want to improve? (e.g. signups, revenue, retention, engagement)"
3. Read relevant source files to understand the current implementation
4. Generate 5–8 experiment ideas in this format:
   ```
   ## Idea 1: [Title]
   Hypothesis: If we [change], then [metric] will improve because [reason].
   What to test: [specific UI/code change]
   Measure: [event to track] using [aggregation]
   Effort: Low/Medium/High
   ```
5. Ask which ideas to implement (user can pick multiple)
6. Proceed with the chosen ideas as separate experiments (run Step 1–4 for each)

### For (A) Single experiment or flag:

## Step 1 — Clarify (ask only what's missing)

You need to know:
- **What changes**: what is different between control and test? (UI element, copy, flow, feature)
- **Success definition**: what action means it worked? (click, signup, purchase, activation, return visit)
- **Universe**: what product area is this? (checkout, onboarding, feed, settings, etc.)

If the user said "try different button colors" you already know: change=color, measure=click.
Only ask what you can't infer. Do NOT ask for things you can derive.

## Step 2 — Decide: gate or experiment?

Use a **gate (GK)** when:
- Binary on/off, no variants to compare
- Gradual rollout without measuring impact
- Emergency killswitch

Use an **experiment (QE)** when:
- Comparing 2+ variants
- Measuring which performs better
- Making a data-driven ship/no-ship decision

## Step 3 — Design the experiment

Map the user's description to params:

| User says | params | success_event |
|---|---|---|
| "different button colors" | `{color: "string"}` | `button_clicked` or `purchase_completed` |
| "shorter/longer form" | `{form_length: "string"}` | `form_submitted` |
| "different CTA text" | `{cta_text: "string"}` | `cta_clicked` |
| "new vs old layout" | `{layout: "string"}` | `page_engaged` or conversion event |
| "show/hide element" | `{show_element: "bool"}` | relevant downstream event |
| "2 vs 3 step flow" | `{steps: "number"}` | `flow_completed` |

For multi-variant: create one group per variant plus control.
Default allocation: 10% to start (conservative). User can increase later.

## Step 4 — Create the resource

### 4a: Create experiment
Call `create_experiment` with:
- name: snake_case, descriptive (e.g. `checkout_button_color_test`)
- universe: inferred from context
- groups: control + test variant(s) with appropriate params filled in
- success_event: the event name the user will track
- allocation: 10 (conservative start)

### 4b: Create gate
Call `create_gate` with name and rollout: 0 (off by default).

### 4c: Create config
Call `create_config` with name and value.

## Step 5 — Implement in code

Call `detect_project` if not already done.
Call `get_sdk_snippet` with the detected language + framework + resource details.

Then:
1. Read the relevant source file (the one the user mentioned, or find it via Glob/Grep)
2. Insert the SDK usage code at the correct location
3. Insert the tracking call at the success event location
4. If the SDK init isn't present, call the setup skill first

For experiments with params, replace hardcoded values with the param:
```
// Before:
<Button color="gray">Buy Now</Button>

// After:
const exp = flags.getExperiment('checkout_button_color_test')
<Button color={exp?.params.color ?? 'gray'}>Buy Now</Button>

// On button click:
flags.track('button_clicked')
```

## Step 6 — Start experiment (ask first)

Say: "The experiment is created in draft mode. Should I start it now (begin collecting data)?
Starting is irreversible — allocation can be increased but not decreased."

If yes: run `flaglab experiments start <name>` via the MCP server.

## Step 7 — Summarize

Report:
- ✓ Experiment `<name>` created and started
- Control: [what users see]
- Test: [what users see]  
- Success event: `<event>` tracked on [where]
- Results available: daily at 02:00 UTC — check with `flaglab experiments status <name>`
```

---

## Skill 3: `experiment-platform:analyze`

**Trigger:** Any of:
- "how is the experiment going"
- "should I ship [feature/experiment]"
- "what are the results"
- "is the test significant"
- "can I ship X"

```markdown
# experiment-platform:analyze

## Step 1 — Get results
Call `experiment_status` with the experiment name (ask if unclear).

## Step 2 — Interpret results

### If verdict = 'ship':
State clearly: "✅ Ship it."
- Primary metric improved by X% (p=Y, significant)
- Guardrails all clear: [list]
- Recommended action: merge the test variant as the default, remove the experiment flag

### If verdict = 'hold':
State clearly: "🚫 Do not ship."
- Which guardrail regressed and by how much
- Explain why this blocks shipping (what the guardrail protects)
- Suggest investigation path

### If verdict = 'wait':
State clearly: "⏳ Inconclusive — need more data."
- How many users are enrolled so far
- Estimated days until significance (if derivable)
- Whether allocation could be increased to speed it up

### If no results yet:
"Analysis runs daily at 02:00 UTC. If the experiment just started, results will appear tomorrow morning."

## Step 3 — Offer next action

Ship: "Want me to remove the experiment code and set the winning variant as default?"
Hold: "Want me to stop the experiment and roll back to control?"
Wait: "Want me to increase allocation to collect data faster?"
```

---

## Skill 4: `experiment-platform:cleanup`

**Trigger:** "remove the experiment", "clean up the flag", "the experiment is done", "ship the winner"

```markdown
# experiment-platform:cleanup

## Step 1 — Confirm the decision
Ask: "Which variant are we keeping as the permanent default — control or test?"
If verdict was already established, state it and confirm.

## Step 2 — Stop the experiment
Run: `flaglab experiments stop <name>`

## Step 3 — Update the code
Find all occurrences of `flags.getExperiment('<name>')` and `flags.getFlag('<name>')`.
Replace with the winning variant's hardcoded values:

```
// Before:
const exp = flags.getExperiment('checkout_button_color_test')
<Button color={exp?.params.color ?? 'gray'}>

// After (if 'green' won):
<Button color="green">
```

Remove the tracking call if the event was experiment-specific.
Remove the SDK init if no other experiments/flags remain.

## Step 4 — Commit
Summarize changes and offer to create a commit.
```

---

## Trigger Coverage Matrix

| User says | Skill triggered |
|---|---|
| "set up experiments in this repo" | setup |
| "install feature flags" | setup |
| "try different colors for this button" | experiment |
| "A/B test the checkout flow" | experiment |
| "add a feature flag for the new dashboard" | experiment |
| "roll out the new search to 10% of users" | experiment |
| "generate ideas to improve signups" | experiment (brainstorm) |
| "what experiments could help retention?" | experiment (brainstorm) |
| "test if removing the banner increases sales" | experiment |
| "set the timeout globally to 5 seconds" | experiment (config) |
| "how is the button color experiment going?" | analyze |
| "should I ship the new checkout?" | analyze |
| "the experiment is done, ship the winner" | cleanup |
| "remove the experiment code" | cleanup |

---

## Cross-AI-Platform Compatibility

Skills are plain markdown — they work identically on:

| Platform | How skills load |
|---|---|
| **Claude Code** | `~/.claude/skills/experiment-platform/` |
| **Cursor** | `.cursor/rules/` (adapt skill as a rule file) |
| **GitHub Copilot** | Custom instructions (paste key sections) |
| **Windsurf** | `.windsurfrules` |
| **Any MCP client** | MCP `prompts` capability (server exposes skills as prompts) |

The MCP server is the cross-platform foundation. The skills guide AI behavior
regardless of which assistant is running — any assistant that can call MCP tools
can execute these workflows.

The MCP server also exposes skills via the `prompts` capability (MCP 0.6+) so AI assistants without file-based skill support can load workflow guidance dynamically — implementation in `10-mcp-server.md` § "MCP Server Implementation".

---

## End-to-End Example Flow

**User:** "Try different CTA text on our pricing page to see if it improves signups"

```
AI reads skill: experiment-platform:experiment

1. Clarify: no questions needed — CTA text + signup event is clear
2. Decide: experiment (comparing variants, measuring conversions)
3. Design:
   - name: pricing_cta_text_test
   - universe: pricing
   - groups: [{name:control,weight:0.5,params:{cta:"Get started"}},
              {name:test,   weight:0.5,params:{cta:"Start free trial"}}]
   - success_event: signup_completed, aggregation: count_users
   - allocation: 10

4. MCP tool: create_experiment(...)
   → CLI: flaglab experiments create pricing_cta_text_test --universe pricing ...
   → Worker API: creates in D1 + rebuilds KV + purges CDN

5. MCP tool: detect_project() → {language: typescript, framework: nextjs, sdk_installed: false}

6. MCP tool: get_sdk_snippet({language: typescript, framework: nextjs, type: experiment, ...})
   → Returns init snippet + usage snippet + tracking snippet

7. AI: reads pricing/page.tsx via Read tool
   AI: inserts experiment code before the CTA button
   AI: inserts flags.track('signup_completed') in the signup success handler

8. AI asks: "Start the experiment now?"
   User: "yes"

9. MCP tool: (shells out) flaglab experiments start pricing_cta_text_test
   → Worker: sets status=running, rebuilds KV, purges CDN

10. AI reports:
    ✓ Experiment started — 10% of pricing page visitors will see "Start free trial"
    ✓ Signup completion events tracked
    ✓ Results available tomorrow at 02:00 UTC
    
    Check results anytime: "how is the pricing CTA experiment going?"
```

---

## Implementation Sequencing

1. MCP server package scaffold (`packages/mcp-server/`)
2. `detect_project` tool — the foundation everything else depends on
3. `auth_check` / `auth_login` tools
4. SDK templates for 3 languages (TypeScript, Python, Ruby) — covers 80% of users
5. `create_gate`, `create_config`, `create_experiment` tools
6. `get_sdk_snippet` with template library
7. `experiment_status` + `list_resources` tools
8. Skill files (setup, experiment, analyze, cleanup)
9. MCP `prompts` capability for cross-platform skill delivery
10. `flaglab mcp install` command (writes AI config files)
11. Extend SDK templates to Go, Java, PHP
12. Publish `@flaglab/mcp-server` to npm
