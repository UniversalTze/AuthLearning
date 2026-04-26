# Auth Learning Project

## What this repo is

A personal sandbox for learning authentication by building one shared frontend that talks to multiple backends — each backend implementing a different auth method. The frontend is the same across all of them, so the *differences* between methods become visible: same login form, same protected page, but radically different mechanics underneath.

This is **a learning repo, not a production system**. Code here prioritises clarity over robustness. Where a real app would add error handling, rate limiting, or hardening, demos here may skip them — but always *call this out* so I know what's missing.

## Why Go for the backends

I deliberately picked Gobecause Go's standard library forces auth mechanics to be visible. There's no framework setting cookies for me, no `@EnableWebSecurity` doing fifteen things behind an annotation. When I write `http.SetCookie(...)` I name every attribute. That's the point.

This means:
- **Default to `net/http` + `chi` for routing.** Don't reach for Gin, Echo, or Fiber unless I ask. Their conveniences hide things I'm trying to see.
- **Don't introduce framework-style abstractions** (custom middleware-of-middleware patterns, dependency injection containers, etc.). Plain functions and `http.Handler` are the units.
- **Hand-roll the auth bits where it's instructive** — session lookup, cookie setting, CSRF token comparison. Reach for libraries only for things I genuinely shouldn't reimplement (see below).

## What I shouldn't hand-roll, ever

Even in a learning repo, these are foot-guns:
- **Password hashing** — use `golang.org/x/crypto/bcrypt` or `argon2`. Never roll my own.
- **JWT signing/verification** — use `github.com/golang-jwt/jwt/v5` or `github.com/go-jose/go-jose`.
- **OAuth client flows** — use `golang.org/x/oauth2` for the token exchange; the *protocol understanding* is what I'm learning, not the HTTP plumbing of the exchange itself.
- **WebAuthn ceremonies** — use `github.com/go-webauthn/webauthn`. The crypto is not negotiable.
- **TLS, random number generation** — `crypto/rand`, never `math/rand`.

The learning is in *using these correctly* and understanding what they do, not reimplementing them.

## Architecture

```
frontend/                  ← React app, shared across all auth methods
backends/
  01-sessions-cookies/     ← each backend is a standalone Go module
  02-jwts/                 ← runs on its own port
  03-oauth-oidc/           ← frontend has a dropdown to pick which backend
  04-google-social-login/
  05-mfa-passwordless/
  06-passkeys-webauthn/
```

Duplication between backends is a feature, not a bug. Each one should be readable top-to-bottom as a self-contained story. Don't extract shared packages — that's a different project, for after I understand all six methods.

## How I want you to teach me

- **Why before how.** Before showing code, explain what problem the concept solves and what would go wrong without it.
- **Show the broken version first when it's instructive.** Seeing a naive implementation get attacked makes the secure version make sense. Always label insecure code clearly (e.g. `// ⚠️ INSECURE — for illustration`).
- **Diagrams over walls of prose for flows.** Use ASCII sequence diagrams when explaining things like OAuth redirects, token exchanges, or session lifecycles.
- **Don't assume I remember.** If a demo builds on a concept from a previous folder, briefly remind me of the relevant bit.
- **Push back on me.** If I ask for something that's a bad idea (rolling my own crypto, storing tokens insecurely, skipping CSRF protection because "it's just a demo"), say so.
- **Tie everything back to what the inspector shows.** The frontend's auth inspector is the main teaching surface — when introducing a new method, explain what will appear in the inspector and why.

## What I already know

- HTTP basics (methods, status codes, headers)
- Cookies as a transport mechanism (roughly)
- General web dev (forms, fetch, JSON APIs)
- React basics (components, hooks, state)
- **Go: assume I'm new-ish.** Explain idiomatic Go patterns when they come up (error handling, interfaces, the `http.Handler` interface, context propagation). Don't write Java-flavoured Go.

## What I'm learning (in order)

1. Sessions & cookies — the foundation
2. JWTs & token-based auth
3. OAuth 2.0 & OIDC — the protocol
4. Social login (Google) — OAuth/OIDC applied
5. MFA & passwordless
6. Passkeys & WebAuthn

Each backend folder has its own `CLAUDE.md` for topic-specific context. The frontend has its own `CLAUDE.md` for UI/inspector concerns.

## Stack & conventions

- **Frontend:** React (Vite) + TypeScript, plain CSS — visuals aren't the point.
- **Backends:** Go 1.22+, `net/http` + `github.com/go-chi/chi/v5` for routing.
- **Database:** SQLite via `modernc.org/sqlite` (pure-Go driver, no CGo headaches). File-based per backend, easy to inspect with `sqlite3` CLI.
- **Each backend runs on its own port** — `3001` sessions, `3002` JWT, `3003` OAuth, `3004` Google, `3005` MFA, `3006` passkeys.
- **Each backend folder is self-contained** — own `go.mod`, own `.env.example`, own README explaining what to run and what to look for in the inspector.

## Go conventions for this repo

- **Package layout:** flat. `main.go`, `handlers.go`, `session.go`, `db.go` in the same package. No `internal/` ceremony for projects this small.
- **Errors:** return them, don't panic. Wrap with `fmt.Errorf("doing X: %w", err)` when adding context.
- **Logging:** `log/slog` (standard library, structured). One logger per `main`, passed via context or as a parameter.
- **Config:** environment variables, read at startup, fail fast if required ones are missing. `.env` loaded via `github.com/joho/godotenv` for local dev only.
- **HTTP handlers:** plain `http.HandlerFunc`. If I find myself building a custom "controller" abstraction, that's a smell.
- **Tests:** `_test.go` next to the file under test. Use `httptest` for handler tests. No mocking frameworks — handwritten fakes if needed.

## Cross-origin concerns (important)

The frontend (`localhost:5173`) and each backend (`localhost:300x`) are different origins. Will need:

- Backends need CORS configured with `Access-Control-Allow-Credentials: true` for cookie-based methods.
- The CORS allowed origin must be exact (not `*`) when credentials are involved — browsers reject `*` with credentials.
- Cookies need `SameSite` configured deliberately, and the implications differ per method.
- This is **realistic**, not an inconvenience. Real apps face this. Don't paper over it; treat the CORS/cookie behaviour as part of what we're learning.

I'll likely use `github.com/go-chi/cors` for the CORS middleware — it's a thin wrapper, doesn't hide what it's doing.

## Known seams in the abstraction

- **OAuth & Google login** require a registered redirect URI. The frontend will handle the callback and forward the authorization code to whichever backend is selected. Mention this when we get to folder 03.
- **WebAuthn / passkeys** tie cryptographic challenges to the frontend's origin (the Relying Party ID). The backend coordinates but the origin that matters is the frontend's. Mention this when we get to folder 06.

## Security guardrails

- Always flag when example code is intentionally insecure or simplified.
- When introducing a new auth pattern, mention the common attacks against it (CSRF, session fixation, token replay, XSS exfiltration, etc.) even if the demo doesn't defend against them.
- Never use real secrets in committed code. Use `.env` files and `.env.example`.
- Always use `crypto/rand` for anything security-sensitive. `math/rand` is for dice rolls, not session IDs.

## What NOT to do

- Don't reach for Gin, Echo, Fiber, or other web frameworks. `net/http` + `chi` is the stack.
- Don't introduce DI containers, code generators, or "clever" abstractions.
- Don't extract shared code between backends — duplication is intentional.
- Don't write production-grade code unless I ask. Keep demos minimal and readable.
- Don't dump giant explanations when a short one will do. I'll ask follow-up questions.
- Don't skip ahead to advanced topics in a folder dedicated to the basics.
