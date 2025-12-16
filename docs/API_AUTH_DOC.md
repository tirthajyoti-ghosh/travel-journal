# API Authentication — Shared Secret with Time-Based Hashing

## Purpose

Provide a **simple, secure, low-overhead authentication mechanism** for a single-user mobile app that:

* Protects write-only API endpoints
* Avoids OAuth, sessions, and databases
* Is easy to rotate and reason about
* Is sufficient for personal use
* Does not block product progress

This mechanism is designed for **Nomoscribe** and intentionally trades enterprise-grade features for **clarity and speed**.

---

## Non-Goals

* ❌ Multi-user authentication
* ❌ OAuth / JWT / session tokens
* ❌ Device-level trust or attestation
* ❌ Perfect resistance against reverse engineering
* ❌ Long-lived credentials over the wire

---

## High-Level Idea

The mobile app and API share a **single secret**.

Instead of sending the secret directly:

* The app sends:

  * Current timestamp
  * A cryptographic hash derived from:

    ```
    hash(secret + timestamp)
    ```

* The server:

  * Recomputes the hash
  * Verifies timestamp freshness
  * Compares hashes
  * Accepts or rejects the request

---

## Security Properties

This provides:

* ✅ Authentication (only holder of secret can call API)
* ✅ Replay protection (timestamp window)
* ✅ No secret sent over the wire
* ✅ Easy manual rotation
* ✅ Minimal code and infra

---

## Authentication Flow

```
Mobile App
  └── Generate timestamp (unix seconds)
        ↓
  └── Compute hash(secret + timestamp)
        ↓
  └── Send request with headers
        ↓
API Server
  └── Validate timestamp window
        ↓
  └── Recompute hash
        ↓
  └── Constant-time compare
        ↓
      Allow / Reject
```

---

## Request Format

### Headers

```http
X-App-Timestamp: 1700000123
X-App-Signature: 5f9a7c2c0a4c8b7e...
```

### Hash Algorithm

```
SHA-256(secret + timestamp)
```

* Output is hex-encoded
* No salt required (timestamp acts as entropy)

---

## Timestamp Rules

| Rule          | Value                  |
| ------------- | ---------------------- |
| Format        | Unix epoch (seconds)   |
| Allowed drift | ±5 minutes             |
| Purpose       | Prevent replay attacks |

Requests outside the window are rejected.

---

## Mobile App Implementation

### Pseudocode

```ts
const timestamp = Math.floor(Date.now() / 1000).toString()
const signature = sha256(APP_SECRET + timestamp)

fetch("/media/upload-url", {
  headers: {
    "X-App-Timestamp": timestamp,
    "X-App-Signature": signature,
  }
})
```

### Secret Storage (Mobile)

* Stored in:

  * Secure runtime config
  * Not committed to source control
* Injected similarly to GitHub PAT usage
* Rotatable by app update or runtime replacement

---

## API Server Implementation

### Verification Logic

```ts
const timestamp = req.headers["x-app-timestamp"]
const signature = req.headers["x-app-signature"]

if (!timestamp || !signature) reject()

if (Math.abs(now() - timestamp) > 300) reject()

const expected = sha256(APP_SECRET + timestamp)

if (!timingSafeEqual(signature, expected)) reject()
```

### Important Notes

* Use **constant-time comparison**
* Never log secrets, hashes, or timestamps
* Fail fast on missing headers

---

## Endpoint Protection

This auth layer applies to:

| Endpoint                   | Protected |
| -------------------------- | --------- |
| `/media/upload-url`        | ✅         |
| Any future write endpoints | ✅         |

Read-only endpoints **do not require auth**.

---

## Secret Generation

### Recommended (Mac shell)

```bash
head -c 48 /dev/urandom | xxd -p | tr -d '\n'
```

* ~384 bits of entropy
* Cryptographically strong
* No hardware RNG dependencies required

---

## Secret Rotation Strategy

### Manual Rotation

1. Generate new secret
2. Update API environment variable
3. Update mobile app runtime secret
4. Redeploy app (if needed)

### During Rotation (Optional)

Server may accept **two secrets** temporarily:

```ts
if (sig matches old OR new) accept
```

---

## Threat Model (Explicit)

### Defended Against

* Network sniffing
* Replay attacks
* Random guessing
* Accidental exposure in logs

### Not Defended Against

* Full reverse engineering of the app
* Physical device compromise
* Malicious user with app binary access

These are **acceptable risks** for this project.

---

## Why Not Ed25519 / JWT / OAuth?

| Reason             | Explanation                       |
| ------------------ | --------------------------------- |
| Overkill           | Single-user app                   |
| More failure modes | Token expiry, clock sync, refresh |
| Slower iteration   | Infra blocks writing              |
| No meaningful gain | Same practical security           |

---

## Migration Path (Future)

This design allows easy upgrade to:

* Ed25519 request signing
* Per-device keys
* Short-lived tokens
* IAM-based auth

Without changing endpoint structure.

---

## Final Summary

| Property          | Status |
| ----------------- | ------ |
| Simple            | ✅      |
| Secure enough     | ✅      |
| Replay-safe       | ✅      |
| No DB             | ✅      |
| Fast to implement | ✅      |
| Future-proof      | ✅      |

---

## Mental Model

> **This API is not public**
>
> It exists only to protect you from accidents and basic abuse
> Not from nation-states or reverse engineers

This is **exactly the right level** of security.
