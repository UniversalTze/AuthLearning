# Frontend

## What this is

A single React app (Vite + TypeScript) that talks to whichever backend I'm currently learning. Its job is twofold:

1. **Be a normal app** — login form, a protected page that confirms authentication and lets me log out.
2. **Be a teaching instrument** — the *Auth Inspector* makes the invisible parts of auth visible: cookies, headers, tokens, decoded claims, expiry times, the request/response that produced the current state.

The interesting question this app exists to answer is: **"Am I authenticated, and how does the browser/server know?"**

The frontend is backend-agnostic — it doesn't care what language or framework the backend is written in (currently Go), only what JSON it returns and what cookies it sets.

## Backend selection

A dropdown at the top of the app picks which backend to talk to:

```
Auth method: [ Sessions & Cookies ▾ ]   →  http://localhost:3001
```

Backends and their ports are configured in a single `backends.ts` file. Adding a new backend = adding one entry there.

## The Auth Inspector

A panel (sidebar or bottom drawer) that's always visible. It grows over time as I learn new methods. Build it incrementally — don't add an inspector section for a method until I'm working on that method.

### Sections, in the order they should appear

| Stage | Section | What it shows |
|---|---|---|
| 01 sessions | **Cookies** | All cookies for the backend's origin, with attributes (`HttpOnly`, `Secure`, `SameSite`, expiry). Note: `HttpOnly` cookies aren't readable from JS — we'll need a backend `/debug/cookies` endpoint to show them. Make this explicit in the UI; it's a learning moment. |
| 01 sessions | **Last request** | Method, URL, status, response time. Helps see what just happened. |
| 02 JWTs | **Tokens** | Any tokens currently held (in memory, localStorage, sessionStorage). For JWTs: decoded header + payload + "signature is opaque", expiry countdown. |
| 03 OAuth | **OAuth flow trace** | The steps that have happened: redirect to authz server → callback received → code exchanged → tokens received. Useful because the flow spans multiple page loads. |
| 05 MFA | **Auth factors** | What's been verified (password ✅, TOTP ✅, etc.) |
| 06 passkeys | **Credential** | The credential ID being used, the RP ID, the challenge that was signed. |

### Inspector design principles

- **Show the raw thing, then explain it.** Show the actual `Set-Cookie` header value, the actual JWT string, the actual decoded JSON. Don't pre-digest it.
- **Mask secrets but make the masking visible.** A JWT signature should appear as `…[64 chars]` not be hidden entirely.
- **Make state changes obvious.** When a token is issued, refreshed, or expires, flash the relevant inspector section.
- **Distinguish "what the browser sees" from "what the server sees".** For `HttpOnly` cookies these differ — and that's the whole point.

## Auth state model

A single `useAuth()` hook exposes the current state. The shape should be uniform across backends so the UI doesn't care which method is in use, but rich enough that the inspector can show method-specific detail.

```ts
type AuthState = {
  status: 'anonymous' | 'authenticated' | 'expired' | 'unknown';
  user: { id: string; email: string } | null;
  method: 'session' | 'jwt' | 'oauth' | 'google' | 'mfa' | 'passkey';
  evidence: Record<string, unknown>;  // method-specific: tokens, claims, etc.
};
```

`evidence` is what the inspector reads to render method-specific detail. Each backend's frontend integration populates it differently.

## The protected page (`/protected`)

This is the page you land on after a successful login. Its job is to *visibly confirm* that authentication worked, not just say "hello". It should always show:

- **A verification message** — e.g. "✅ Authenticated as **alice@example.com** via **session cookie**". The method comes from `AuthState.method` so the wording adapts per backend.
- **The identity the server returned** — user ID and email, fetched from `GET /me`. This proves the server recognised the credentials, not just that the frontend thinks it did.
- **A "Verify again" button** — re-runs `GET /me` and updates the display. Useful for showing what happens when a session/token expires (the inspector flashes, the verification message changes to "expired").
- **A logout button** — calls the backend's logout endpoint, clears local auth state, redirects to `/login`. After logout, the inspector should visibly clear (cookies gone, tokens gone) so you can see the round-trip.
- **A small "what just happened" trace** — the last 1–2 requests this page made (`GET /me` → 200), with timing. Same data the inspector shows, but inline on the page so you don't have to look away.

Design principles:

- **The verification message is the headline.** Big, obvious, top of the page. Whether you're authenticated should be readable in half a second.
- **Logout is destructive — make it deliberate.** Plain button is fine, no need for a confirm dialog, but don't make it the most prominent thing on the page.
- **When `status === 'expired'`, the page should say so clearly** rather than redirecting silently. Part of the learning is *seeing* expiry happen.

## Conventions

- TypeScript everywhere. No `any` unless I explicitly accept it.
- Keep components small. The inspector should be one component per section, composed together.
- Don't reach for a state library yet — `useState` + `useContext` is enough until it isn't.
- Routing: `react-router`. Routes: `/`, `/login`, `/protected`, `/callback` (for OAuth, added later).
- `fetch` calls always set `credentials: 'include'` for cookie-based backends. Wrap in a small `apiFetch()` helper that knows the current backend's base URL.

## Things to flag clearly when they come up

- **Storing tokens in localStorage vs cookies vs memory.** Each has trade-offs (XSS exposure, CSRF exposure, page reload survival). When we add a method, explain what we're choosing and why.
- **CORS with credentials.** When we set `credentials: 'include'` on `fetch`, the backend's CORS config has to match (exact origin, not `*`, plus `Access-Control-Allow-Credentials: true`). This trips everyone up at least once.
