# fdk-second-brain

A personal "second brain": a remote MCP server on the Cloudflare Workers free plan, in front of a **separate private GitHub repository** of Markdown notes. Claude Code, Claude Desktop, Claude web and phone, and ChatGPT all read and write the same notes through it.

See [`TECHNOLOGIES.md`](TECHNOLOGIES.md) for the stack and the commands, and [`CLAUDE.md`](CLAUDE.md) for the code rules.

## What you can do

Once connected, ask your AI client things like "save this idea", "what did I decide about X?" or "update the project note". It calls these tools:

| Tool           | What it does                                                       |
| -------------- | ------------------------------------------------------------------ |
| `save_idea`    | Saves a quick idea as a new dated note in `ideas/`                 |
| `search_notes` | Keyword search; returns short snippets (path, heading, ~300 chars) |
| `read_note`    | Reads a whole note                                                 |
| `read_section` | Reads one section of a note, by heading, to save tokens            |
| `list_notes`   | Lists note paths                                                   |
| `write_note`   | Creates a note, or replaces a whole one                            |
| `edit_note`    | Replaces one passage of a note                                     |
| `move_note`    | Renames or moves a note                                            |
| `delete_note`  | Deletes a note                                                     |

Every change is a commit in the notes repository, so the history is kept and any change can be undone in git. Notes edited directly on GitHub or in Obsidian reach the search index through the push webhook, and a daily job repairs anything it missed.

## Setup

You need Bun, the GitHub CLI (`gh`) signed in, and a Cloudflare account. Every command runs from this folder.

### 1. The notes repository

Create it **private**, on `main`, with a first commit, before the first deploy. The server never works against an empty repository.

```sh
mkdir -p second-brain-notes/{ideas,projects,decisions,interviews} && cd second-brain-notes
printf '# Overview\n\nWho I am, my goals, and how these notes are organised.\n' > overview.md
for d in ideas projects decisions interviews; do printf '# %s\n' "$d" > "$d/README.md"; done
git init -b main && git add . && git commit -m "chore: starter notes structure"
gh repo create <your-login>/second-brain-notes --private --source . --remote origin --push
```

`overview.md` is the main context note: who you are and what you are working towards.

### 2. Cloudflare resources

```sh
bun install
bunx wrangler login
bunx wrangler d1 create second-brain
bunx wrangler kv namespace create OAUTH_KV
bunx wrangler queues create second-brain-index
```

Put the printed D1 `database_id` and KV `id` in `wrangler.jsonc`, then:

```sh
bunx wrangler d1 migrations apply second-brain --remote
bun run deploy
```

The deploy prints the Worker's URL, `https://second-brain-mcp.<your-subdomain>.workers.dev`. It is the `PUBLIC_URL` below. The dead-letter queue is created by the deploy.

### 3. GitHub credentials

- **Fine-grained personal access token** ([new token](https://github.com/settings/personal-access-tokens/new)): Repository access, Only select repositories, the notes repository. Permissions: Contents, Read and write. The server reads and writes notes only with this token.
- **OAuth App**, not a GitHub App ([new OAuth App](https://github.com/settings/applications/new)): Homepage URL `PUBLIC_URL`, Authorization callback URL `<PUBLIC_URL>/callback`, Device Flow off. Copy the Client ID and generate a client secret. Only your account can sign in: the server compares GitHub's numeric user ID (the `"id"` at `https://api.github.com/users/<your-login>`) with `OWNER_GITHUB_ID`.

### 4. Settings and secrets

Set each one in your own terminal; wrangler prompts with hidden input. Keep them all as Worker secrets so this public repository never holds your settings.

```sh
bunx wrangler secret put NOTES_REPO_OWNER      # your GitHub login
bunx wrangler secret put NOTES_REPO_NAME       # second-brain-notes
bunx wrangler secret put NOTES_BRANCH          # main
bunx wrangler secret put PUBLIC_URL            # https://second-brain-mcp.<your-subdomain>.workers.dev
bunx wrangler secret put OWNER_GITHUB_ID       # your numeric GitHub user ID
bunx wrangler secret put GITHUB_TOKEN          # the fine-grained token
bunx wrangler secret put GITHUB_CLIENT_ID      # the OAuth App's Client ID
bunx wrangler secret put GITHUB_CLIENT_SECRET  # the OAuth App's client secret
```

The webhook secret goes to the Worker and to GitHub in one step, without being printed:

```sh
SECRET="$(openssl rand -hex 32)"
printf '%s' "$SECRET" | bunx wrangler secret put GITHUB_WEBHOOK_SECRET
jq -n --arg s "$SECRET" --arg u "<PUBLIC_URL>/webhooks/github" \
  '{name:"web",active:true,events:["push"],config:{url:$u,content_type:"json",secret:$s,insecure_ssl:"0"}}' |
  gh api repos/<your-login>/second-brain-notes/hooks --method POST --silent --input -
unset SECRET
```

The secret travels on standard input, so it never shows in the process list. Run this once: a second run would add a second webhook and leave the first one failing its signature checks. To rotate the secret, delete the old webhook first (notes repository → Settings → Webhooks).

Secrets take effect right away; no new deploy is needed. A missing or invalid one makes every request fail, and the Worker logs (`bunx wrangler tail`) name exactly which one is wrong.

## Connecting clients

The MCP endpoint is `<PUBLIC_URL>/mcp`. Each client registers itself, opens a consent page, and sends you to GitHub to sign in once.

- **Claude Code:** `claude mcp add -s user --transport http second-brain <PUBLIC_URL>/mcp`, then run `/mcp` in Claude Code and choose Authenticate.
- **Claude web, Desktop and phone:** on claude.ai, Settings → Connectors → Add custom connector, with the name `Second brain` and the URL `<PUBLIC_URL>/mcp`, then Connect. A connector added on the web also shows in Desktop and on the phone. The Free plan allows one custom connector; Pro, Max, Team and Enterprise allow more. On Team and Enterprise, an owner adds it first.
- **ChatGPT:** Settings → Apps & Connectors → Advanced → turn on Developer mode, then Create, with the URL `<PUBLIC_URL>/mcp` and OAuth authentication. Full MCP connectors (write tools included) are a beta for ChatGPT Business, Enterprise and Edu on the web; ChatGPT asks you to confirm each write.

## Using it day to day

- Edit notes anywhere: through the AI, on GitHub, or in a local clone (Obsidian works). Search catches up within seconds of a push.
- To see what the server does: `bunx wrangler tail`.
- Failed indexing messages wait in the `second-brain-index-dlq` queue for 24 hours (Cloudflare dashboard → Queues); the daily reconciliation at 04:17 UTC repairs the index anyway.
- To sign out every connected client, delete the server's grants and tokens from `OAUTH_KV`. Clients then have to sign in again:

    ```sh
    for p in grant: token:; do
      bunx wrangler kv key list --binding OAUTH_KV --remote --prefix "$p" | jq -r '.[].name' |
        xargs -n1 bunx wrangler kv key delete --binding OAUTH_KV --remote
    done
    ```

    The OAuth App's authorizations on GitHub and `GITHUB_CLIENT_SECRET` only guard new sign-ins; GitHub's token is used once and never kept. To cut off note access, revoke the fine-grained token.

## Free-plan limits

Everything fits the Cloudflare Workers free plan for one person: 100,000 requests a day, 10,000 queue operations a day, 100,000 KV reads and 1,000 KV writes a day, and D1's free storage. The details are in [`TECHNOLOGIES.md`](TECHNOLOGIES.md).
