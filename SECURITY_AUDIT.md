# Honeydew Security Vulnerability Analysis

**Date:** 2026-02-28
**Scope:** Full codebase review — authentication, authorization, input validation, data exposure, external integrations

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 5 |
| Medium | 8 |
| Low | 6 |
| Informational | 3 |

---

## Critical Findings

### C1: Magic Link Tokens Generated with `Math.random()` (Insecure PRNG)

**File:** `functions/database/_db.ts:27-37`
**Impact:** Account takeover

The `makeid()` function used to generate magic link tokens relies on `Math.random()`, which is **not cryptographically secure**. `Math.random()` uses a deterministic PRNG (typically xoshiro256) that can be predicted if an attacker observes enough outputs. Since magic links grant full authentication, a predictable token means an attacker could forge valid magic links for any user.

```typescript
// functions/database/_db.ts:27-37
function makeid(length: number) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}
```

This function is called from `UserMagicKeyGenerateId()` at line 352 to produce the 50-character magic key.

**Recommendation:** Replace with `crypto.getRandomValues()`:

```typescript
function makeid(length: number) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    return Array.from(values, (v) => characters[v % characters.length]).join('');
}
```

---

### C2: Magic Links Are Not Consumed After Use — Replayable for 1 Hour

**File:** `functions/auth/magic/[id].ts:26-27`
**Impact:** Account takeover via link reuse

When a magic link is used, the key is **looked up but never deleted** from KV:

```typescript
// functions/auth/magic/[id].ts:26-27
// Look up the magic key without consuming it - links stay valid for their full 1-hour TTL
const {user: magic_user, error} = await db.UserMagicKeyLookup(magic_key);
```

The `UserMagicKeyLookup` method (`_db.ts:385`) reads the KV entry but does not delete it. This means:
- A magic link intercepted in transit (email, chat history, browser history, shared device) can be reused by anyone for the full 1-hour TTL
- If sent via Telegram (`_handler.ts:53`), any Telegram client with access to the chat can reuse it
- No audit trail of how many times a link was used

**Recommendation:** Delete the KV key immediately after successful lookup to make magic links single-use:

```typescript
const {user: magic_user, error} = await db.UserMagicKeyLookup(magic_key);
if (magic_user != null) {
    await db.UserMagicKeyDelete(magic_key); // consume the key
}
```

---

## High Findings

### H1: DEVICE_TOKEN (Refresh Token) Never Expires

**File:** `functions/auth/signup.ts:106-109`, `functions/auth/magic/[id].ts:37-39`
**Impact:** Permanent session compromise

The `DEVICE_TOKEN` JWT is created **without an `exp` claim**:

```typescript
// functions/auth/signup.ts:106-109
const refresh_token = await jwt.sign({
    id: user.id,
    // tokens do not expire just because why not?
}, secret);
```

This means a stolen `DEVICE_TOKEN` grants **permanent access** to the account. There is no token rotation, no revocation mechanism, and no way for a user to invalidate old sessions. The comment "why not?" suggests this was a conscious shortcut.

**Recommendation:**
- Add an `exp` claim (e.g., 30 or 90 days)
- Implement token rotation: issue a new refresh token on each use, invalidating the old one
- Store active refresh token hashes server-side to allow revocation

---

### H2: Missing `Secure` Flag on Authentication Cookies

**File:** `functions/_utils.ts:117-121`
**Impact:** Token theft over unencrypted connections

The `setCookie()` function does not set the `Secure` flag:

```typescript
// functions/_utils.ts:117-121
export function setCookie(response: Response, key: string, value: string, http_only: boolean = true, expires: string = "Fri, 31 Dec 9999 23:59:59 GMT") {
    const http = (http_only) ? "HttpOnly;" : "";
    const newCookie = `${key}=${value}; SameSite=Strict;Path=/;${http};expires=${expires};`
    response.headers.append("Set-Cookie", newCookie);
}
```

Without `Secure`, cookies containing JWTs (both `DEVICE_TOKEN` and `TEMP_TOKEN`) can be transmitted over plain HTTP if a user accesses the site via `http://`. An attacker on the same network could intercept these tokens via passive sniffing or SSL stripping.

Additionally, the `TEMP_TOKEN` is set with `http_only: false` (`signup.ts:20`, `magic/[id].ts:59`), making it accessible to client-side JavaScript and vulnerable to XSS-based theft.

**Recommendation:** Add `Secure;` to the cookie string. Consider making `TEMP_TOKEN` HttpOnly as well unless there's a specific client-side need.

---

### H3: Missing Household-Level Authorization on Chore Complete/Delete

**File:** `functions/api/routers/chores.ts:94, 125-126`
**Impact:** Cross-household data manipulation (IDOR)

Both `chores.complete` and `chores.delete` accept a chore ID but **do not verify** the chore belongs to the authenticated user's household:

```typescript
// functions/api/routers/chores.ts:94-95
// TODO: check if this chore belongs to this household
const result = await db.ChoreComplete(chore_id.data, user.id);
```

```typescript
// functions/api/routers/chores.ts:125-126
// TODO: check if this chore belongs to this household
return await db.ChoreDelete(chore_id.data);
```

A user in Household A can complete or delete chores belonging to Household B by supplying a valid `ChoreId`. The branded ID validation only checks format (`C:` prefix + UUID), not ownership.

**Recommendation:** Fetch the chore, verify `chore.household_id === user.household` before performing the action (as is already done in `assignTo` at line 183).

---

### H4: Missing Authorization on Project/Task Operations (IDOR)

**File:** `functions/api/routers/projects.ts:61-90`
**Impact:** Cross-household data manipulation

Four project/task endpoints have explicit `TODO` comments acknowledging missing authorization:

- `delete_task` (line 65): `// TODO: get the task/project and make sure the user can do this`
- `complete_task` (line 72): Same TODO
- `get_tasks` (line 79): Same TODO
- `delete` (line 87): Same TODO

Any authenticated user can delete tasks, complete tasks, view tasks, or delete projects belonging to **any household** by guessing or enumerating `ProjectId`/`TaskId` values.

**Recommendation:** For each operation, fetch the parent project and verify `project.household === user.household`.

---

### H5: Server Error Response Leaks Internal Details

**File:** `functions/_utils.ts:34-41`, `functions/auth/_middleware.ts:146-154`
**Impact:** Information disclosure aiding further attacks

`ResponseJsonServerError` includes the raw `data` parameter in the response body:

```typescript
// functions/_utils.ts:34-41
export const ResponseJsonServerError = (data:unknown): Response => {
    const status = 500;
    console.error("SERVER ERROR", data);
    return new Response(JSON.stringify({
        message: "Server Error",
        data,  // <-- leaks internal details to the client
    }), { status });
}
```

The global error handler in `topLevelHandler` similarly leaks error messages and paths:

```typescript
// functions/auth/_middleware.ts:146-154
res = new Response(JSON.stringify({
    error: "Internal Server Error",
    message: errorMessage,  // <-- may contain stack traces, DB errors
    path: url.pathname,
}), { status: 500 });
```

These can expose database schema details, internal function names, file paths, and dependency versions.

**Recommendation:** Return generic error messages to clients. Log detailed errors server-side only.

---

## Medium Findings

### M1: Telegram Account Linking Has No Verification

**File:** `functions/auth/telegram/[id].ts:21`
**Impact:** Account linking to arbitrary Telegram chat IDs

The Telegram linking endpoint accepts any numeric `id` parameter and directly associates it with the authenticated user:

```typescript
// functions/auth/telegram/[id].ts:21
await db.UserRegisterTelegram(user.id, Number(id), 0);
```

There is no verification that the authenticated user owns the Telegram account with that chat ID. An attacker could:
1. Link a victim's Honeydew account to the attacker's Telegram chat ID
2. Receive the victim's chore assignments and magic links via Telegram

**Recommendation:** Use the Telegram Bot API's login widget or a challenge-response mechanism to verify ownership of the Telegram account.

---

### M2: SSRF via Recipe URL Scraping

**File:** `functions/api/routers/recipes.ts:97-121`, `functions/_recipe/index.ts:30-50`
**Impact:** Server-Side Request Forgery

The `recipes.add` endpoint accepts an arbitrary URL (`z.string().url()`) and the server fetches it:

```typescript
// functions/api/routers/recipes.ts:97
add: protectedProcedure.input(z.string().url()).query(async (ctx) => {
```

The scrapers (e.g., `ld_json.ts`, `microdata.ts`) fetch whatever URL is provided with no restrictions on:
- **Internal/private IPs** (e.g., `http://169.254.169.254/` for cloud metadata, `http://localhost:*`, `http://10.x.x.x/`)
- **Non-HTTP protocols** (partially mitigated by `z.string().url()` but the scrapers use `new URL()` then `fetch()`)
- **Response size** — no limit on how much data is downloaded
- **Redirects** — fetch follows redirects by default, potentially to internal addresses

While Cloudflare Workers have some inherent network restrictions, this is still a risk for internal service enumeration.

**Recommendation:**
- Validate the URL scheme is `https` only
- Block private/reserved IP ranges
- Set response size limits and timeouts

---

### M3: Debug Scraper Available in Production

**File:** `functions/_recipe/index.ts:23, 32`
**Impact:** Bypasses normal scraping validation

The `DebugScraper` is always checked first, regardless of environment:

```typescript
// functions/_recipe/index.ts:32
if (DEBUG_SCRAP.canParseUrl(url)) return DEBUG_SCRAP.parseUrl(url);
```

It responds to `debugscraper.com` URLs with hardcoded fake data. While the impact is limited (the domain would need to be registered), this debug code should not be active in production.

**Recommendation:** Gate behind `PRODUCTION !== "true"` check.

---

### M4: Cookie Parsing Vulnerability — Substring Matching

**File:** `functions/auth/_middleware.ts:15-25`
**Impact:** Cookie confusion / injection

The `getCookie` function uses `includes()` for matching:

```typescript
// functions/auth/_middleware.ts:18-19
const targetCookie = allCookies.find(cookie => cookie.includes(key))
if (targetCookie) {
    const [_, value] = targetCookie.split("=")
```

This has two problems:
1. `includes(key)` matches substrings: a cookie named `MY_TEMP_TOKEN` would match a search for `TEMP_TOKEN`
2. `split("=")` only splits into 2 parts, so if the value contains `=` (common in base64/JWT), the value is truncated

**Recommendation:** Use `cookie.startsWith(key + "=")` and `cookie.substring(key.length + 1)` for the value.

---

### M5: No Rate Limiting on Authentication Endpoints

**File:** `functions/auth/signup.ts`, `functions/auth/magic/[id].ts`, `functions/api/routers/me.ts:19`
**Impact:** Brute force, resource exhaustion

There is no rate limiting on:
- **Signup** (Turnstile CAPTCHA helps in production but is bypassed in dev)
- **Magic link generation** (`me.magic_link`) — can be called repeatedly to flood KV
- **Magic link consumption** (`auth/magic/[id]`) — can be brute-forced
- **Household invite key verification** (`auth/join/[id]`)

**Recommendation:** Implement rate limiting via Cloudflare Rate Limiting rules or KV-based counters.

---

### M6: Trigger Endpoints Lack Authentication

**File:** `functions/triggers/_middleware.ts:1-5`, `functions/triggers/schedule/chores.ts:106`
**Impact:** Unauthorized trigger execution

The trigger middleware only runs `topLevelHandler` (DB init + error logging) — it does **not** run `jwtHandler` or `userAuthHandler`:

```typescript
// functions/triggers/_middleware.ts:5
export const onRequest: HoneydewPagesFunction[] = [topLevelHandler]
```

The chore scheduling endpoint is a plain GET (`onRequestGet`) with no authentication:

```typescript
// functions/triggers/schedule/chores.ts:106
export const onRequestGet: HoneydewPagesFunction = async function (context) {
```

Anyone can call `/triggers/schedule/chores` to trigger chore assignment and Telegram notifications. In non-production mode, the response also leaks user data (line 130-134).

**Recommendation:** Add a shared secret or API key check for trigger endpoints. The TODO at line 111 acknowledges this: `// TODO: we could use KV to make sure we aren't running too often?`

---

## Low Findings

### L1: Recovery Key Uses UUIDv4 — Insufficient Entropy for Secret

**File:** `functions/database/_db.ts:216`
**Impact:** Weak recovery key

```typescript
const recovery_key = uuidv4(); // https://neilmadden.blog/2018/08/30/moving-away-from-uuids/
```

The comment links to an article explaining why UUIDs are poor secrets. UUIDv4 provides only 122 bits of randomness in a specific format — while adequate, a dedicated secret token with full character space would be stronger. The code also includes a comment acknowledging this: `// I need to come up a better-mechanism, I need at least 128 bits`.

**Recommendation:** Generate recovery keys with `crypto.getRandomValues()` and base64url encoding.

---

### L2: `TEMP_TOKEN` Not HttpOnly

**File:** `functions/auth/signup.ts:20`, `functions/auth/magic/[id].ts:59`
**Impact:** XSS-accessible authentication token

```typescript
setCookie(response, TEMP_TOKEN, generic_token, false); // http_only = false
```

The `TEMP_TOKEN` contains the user's ID and name in a JWT. While `SameSite=Strict` helps, if any XSS vulnerability is found, this token can be exfiltrated.

**Recommendation:** Set `HttpOnly` unless the token is explicitly needed by client-side JavaScript.

---

### L3: Household Join Link Not Consumed After Use

**File:** `functions/auth/join/[id].ts:57-89`
**Impact:** Join link reuse

When an authenticated user joins a household via the join link, the household key is **not deleted** (unlike signup, which deletes the key at line 86 of `signup.ts`). The link remains valid indefinitely (house keys have no TTL by default) and anyone with the link can join the household.

**Recommendation:** Delete the house key after a successful join, or add a TTL.

---

### L4: Timing Oracle on Household Invite Verification

**File:** `functions/auth/join/[id].ts:41-54`
**Impact:** Information leakage

The `VerifyHouseKeyCode` function has different code paths for invalid format, bad SHA, and non-existent key, each returning at different times. The code acknowledges this: `// TODO: don't respond right away to prevent timing attacks` (line 47).

**Recommendation:** Use constant-time comparison for the SHA check and normalize response times.

---

## Informational Findings

### I1: Error Messages Persisted to KV Include Potential Sensitive Data

**File:** `functions/auth/_middleware.ts:121-129`
**Impact:** Sensitive data stored longer than necessary

`console.error` and `console.warn` are patched to persist all arguments to KV with a 36-hour TTL. If error logs happen to contain user data, tokens, or other sensitive values, they'll be stored in KV.

---

### I2: `ResponseJsonNotImplementedYet` Leaks Stack Frame

**File:** `functions/_utils.ts:59-66`

```typescript
const fn_name = new Error().stack?.split("\n")[1].trim();
```

The function name from the call stack is included in the response, exposing internal code structure.

---

### I3: `ResponseJsonNotFound` Returns 400 Instead of 404

**File:** `functions/_utils.ts:27-32`

```typescript
export const ResponseJsonNotFound = (): Response => {
    const status = 400;  // Should be 404
```

This is a bug, not a vulnerability, but may confuse clients and monitoring tools.

---

## Additional Findings from Frontend Analysis

### M7: No Content Security Policy (CSP) or Security Headers

**File:** No security headers set in any response
**Impact:** Weakened XSS defense-in-depth

The application does not set `Content-Security-Policy`, `X-Frame-Options`, or `X-Content-Type-Options` headers. Without CSP, if any XSS vector is found, there are no browser-level mitigations to limit its impact. Without `X-Frame-Options`, the app can be embedded in iframes for clickjacking attacks.

**Recommendation:** Add security headers via Cloudflare Pages `_headers` file or in middleware:
- `Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com; img-src 'self' https:; style-src 'self' 'unsafe-inline'`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`

---

### M8: Clothing Operations Missing Household Ownership Checks

**File:** `functions/api/routers/clothes.ts:56-86`
**Impact:** Cross-household data manipulation (IDOR)

The `delete`, `mark_worn`, `mark_clean`, and `mark_dirty` endpoints accept a `ClothingIdZ` but do not verify the clothing item belongs to the user's household. Any authenticated user can manipulate clothing items from other households.

**Recommendation:** Fetch the clothing item and verify `clothing.household === user.household` before performing the action.

---

### L5: No Server-Side Logout / Token Revocation

**File:** `functions/auth/signout.ts`
**Impact:** Tokens remain valid after logout

The signout endpoint only deletes cookies on the client side. There is no server-side token revocation. A stolen `DEVICE_TOKEN` remains valid even after the user logs out.

**Recommendation:** Maintain a token revocation timestamp per user in KV. During JWT verification, reject tokens issued before the last logout time.

---

### L6: Third-Party CDN Resources Without Subresource Integrity (SRI)

**File:** `public/index.html`
**Impact:** Supply chain risk

Font Awesome CSS is loaded from a CDN without SRI hashes. If the CDN is compromised, malicious CSS could be injected.

**Recommendation:** Add `integrity="sha384-..."` attributes to CDN `<link>` and `<script>` tags.

---

## Positive Security Observations

The codebase has several strong security patterns:

1. **SQL injection protection** — Kysely ORM with parameterized queries throughout; no raw SQL concatenation detected
2. **Branded Zod types for IDs** — Entity IDs validated at format level, preventing many injection patterns
3. **No `v-html` or `innerHTML`** usage in Vue templates — eliminates the most common XSS vector
4. **tRPC type safety** — End-to-end type safety reduces miscommunication between frontend and backend
5. **SameSite=Strict cookies** — Provides baseline CSRF protection
6. **Telegram webhook secret validation** — Prevents unauthorized webhook invocations
7. **Password-less auth** — Eliminates credential stuffing and password-related attacks
8. **Turnstile CAPTCHA on signup** — Prevents automated account creation in production

---

## Remediation Priority

| Priority | Finding | Effort |
|----------|---------|--------|
| 1 | C1: Replace Math.random() with crypto.getRandomValues() | Low |
| 2 | C2: Consume magic links after use | Low |
| 3 | H1: Add expiration to DEVICE_TOKEN | Low |
| 4 | H3+H4+M8: Add household ownership checks to chore/project/task/clothing operations | Medium |
| 5 | H2: Add Secure flag to cookies | Low |
| 6 | H5: Stop leaking error details to clients | Low |
| 7 | M6: Authenticate trigger endpoints | Medium |
| 8 | M1: Add Telegram linking verification | Medium |
| 9 | M4: Fix cookie parsing | Low |
| 10 | M7: Add CSP and security headers | Low |
| 11 | M5: Add rate limiting | Medium |
| 12 | M2: Add SSRF protections to recipe scraping | Medium |
| 13 | M3: Gate debug scraper behind production flag | Low |
| 14 | L5: Implement server-side token revocation | Medium |
