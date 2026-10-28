# OAuthor: Spec

Know if it's an hour or six weeks.

OAuthor tells a developer what it takes to register an OAuth app with a provider and get it approved, so their users can connect that app through Composio. It's the Composio APM Integrations take-home.

## The user

A developer building on Composio who has to bring their own OAuth app for a toolkit. That happens for one of two reasons:

- The toolkit has no Composio-managed OAuth app (258 of the 382 OAuth toolkits on [Managed OAuth apps](https://docs.composio.dev/toolkits/managed-auth)).
- They're going to production and need their own app for branding, custom scopes, their own quota, faster polling, or a custom instance ([Managed vs custom auth](https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app)).

## The deliverable

A hosted single-page app with three parts:

1. **Library.** Cards for guides that have already been generated.
2. **Chat.** A text box at the bottom of the page that drives everything else.
3. **Live generation.** Type any app's name or URL, watch the agent research it, and see the guide fill in section by section on the same page.

Plus a README in the style of the Yapn README: what it is, how it works, the guide schema, how it was built, what's solid vs uncertain, limits, and how to run it locally.

## Page

```
┌───────────────────────────────────────────────┐
│ OAuthor                                       │
│ [Spotify] [Xero] [DocuSign] [Meta Ads] [X] [Gmail]   ← library cards
│                                               │
│ Active guide (opened card or live run)        │
│   status line while running                   │
│   sections fill in, in schema order           │
│                                               │
│ assistant text (ephemeral, not stored)        │
│ [ Ask about an app…                       ⏎ ] │
└───────────────────────────────────────────────┘
```

- No redirects. Opening or generating a guide updates the URL with `history.pushState` (`/?app=spotify`) so the link can be shared.
- Opening a URL with `?app=` loads that guide.

## Chat

- A real chat. Plain text answers appear above the input box and are lost on reload.
- The only thing that gets saved is a guide, through `render_guide`. Conversations aren't stored.
- When a guide is open, the chat can answer questions about it, such as "why is Xero a 2?".

## Agent

One model running a loop with three tools.

| Tool | Does |
|---|---|
| `get_guide(slug)` | Reads a saved guide from Supabase. Returns null if there isn't one. Called before `research_app` and whenever a guide is discussed. |
| `research_app(name)` | Runs Firecrawl search and scrape through Composio and returns the doc pages as markdown. |
| `render_guide(guide)` | Its input is the Guide schema. It streams into the UI section by section, is validated with Zod, then is saved to Supabase. |

- Model: `claude-sonnet-5-5` through OpenRouter, using the Vercel AI SDK and `@openrouter/ai-sdk-provider`. The model ID can be overridden with an environment variable.
- The chat model only extracts from the gathered pages. It doesn't invent requirements.
- If `render_guide` input fails Zod validation, the error goes back to the model once so it can fix it.

### research_app

```
FIRECRAWL_SEARCH "{app} developer OAuth app registration"
FIRECRAWL_SEARCH "{app} OAuth app review verification"
FIRECRAWL_SCRAPE top 4–6 unique URLs → markdown (main content only, truncated per page)
```

It runs on the owner's Firecrawl account through Composio. It doesn't use `FIRECRAWL_EXTRACT`, because the chat model does the extraction.

## Guide schema

```ts
Guide {
  app: { name: string; website: string }
  difficulty: { level: 1 | 2 | 3 | 4 | 5; why: string }
  time: { setup: string; approvalWait: string | null }
  requirements: string[]
  agentHelp: { canDo: string[]; youMustDo: string[] }
  steps: { title: string; detail: string }[]
  blockers: { problem: string; fix: string }[]
  references: { title: string; url: string }[]
}
```

Render order, by the question each section answers:

1. Verdict (`difficulty` and `time`): is this an hour or weeks?
2. Before you start (`requirements`): do I qualify?
3. Who does what (`agentHelp`): what can I hand off?
4. Steps: what do I do, in order?
5. If you're stuck (`blockers`): what if it breaks?
6. References.

## Storage

Supabase project `corporate-merch`, schema `composio`, table `guides`. The table already exists.

| Column | Type |
|---|---|
| slug | text, primary key |
| app_name | text |
| guide | jsonb |
| model | text |
| created_at, updated_at | timestamptz |

- RLS: the public can read. Only the server writes, using the service role key.
- `composio` must be listed under Exposed schemas in Supabase → Settings → Data API.

## Library apps

| App | Why it's in the library |
|---|---|
| Spotify | Easy to create; development mode caps users |
| Xero | Free developer account; connection cap until partner certification |
| DocuSign | Free developer sandbox; going live needs a review |
| Meta Ads | Business verification plus App Review |
| Twitter/X | Paid API tiers |
| Gmail | Composio-managed, but needs your own app and verification for production |

These are seeded by running the agent on each app.

## Out of scope for v0

- Owner tags on individual steps (agent vs human)
- Tested, sourced or uncertain labels on individual claims (the README covers this)
- Rate limiting
- Stored conversations
- Browser automation attempting real setup

## Stack

Next.js (App Router) on Vercel, Vercel AI SDK, OpenRouter, Composio (`@composio/core`), Supabase, Zod, Tailwind.

## Env

```
OPENROUTER_API_KEY=
OAUTHOR_MODEL=anthropic/claude-sonnet-5.5
COMPOSIO_API_KEY=
COMPOSIO_USER_ID=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

No credentials in the repo. Commit `.env.example` only.
