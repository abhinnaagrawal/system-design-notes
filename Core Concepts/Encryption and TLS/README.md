# Encryption & Transport Layer Security (TLS)

**Sources:** 
- [Symmetrical vs Asymmetrical Encryption (Hussein Nasser)](https://www.youtube.com/watch?v=Z3FwixsBE94)
- [Transport Layer Security, TLS 1.2 and 1.3 Explained (Hussein Nasser)](https://www.youtube.com/watch?v=AlE5X1NlHgg)

**TL;DR:** HTTPS uses TLS for authenticated, encrypted transport. Modern certificate-authenticated handshakes normally use ephemeral (EC)DHE key agreement, certificate-key signatures for authentication, and derived symmetric AEAD traffic keys for records. Public-key encryption of a session secret describes legacy RSA key transport, not TLS 1.3.

> **Version scope:** TLS 1.2 ECDHE and TLS 1.3 (RFC 8446). Handshake round trips below count TLS messages; DNS, TCP setup, retransmissions and HelloRetryRequest add latency.

---

## 1. The Foundation: Encryption Types

To understand TLS, you must first understand the two primary types of cryptography it relies upon, as each solves the other's weakness.

### Symmetrical Encryption
Both the sender and receiver use the **exact same key** to encrypt and decrypt the message.
*   **How it works:** Alice encrypts a message with "Key A". Bob uses "Key A" to decrypt it.
*   **Common Algorithms:** AES (Advanced Encryption Standard).
*   **Pros:** Extremely fast and computationally cheap. Excellent for encrypting large amounts of data (like streaming video or downloading a file).
*   **Cons:** **The Key Exchange Problem**. How do Alice and Bob agree on "Key A" if they are communicating over the open internet? If a hacker intercepts the key while they are sharing it, the encryption is compromised.

### Asymmetrical Encryption (Public-Key Cryptography)
Every participant generates a **pair of mathematically linked keys**: a Public Key (shared with the world) and a Private Key (kept strictly secret).
*   **How it works:** If Alice wants to send a secure message to Bob, she encrypts it using **Bob's Public Key**. Because of the math involved, that message can now *only* be decrypted by **Bob's Private Key**.
*   **Common Algorithms:** RSA supports encryption or signatures under appropriate schemes. ECDSA/EdDSA provide signatures; ECDH provides key agreement.
*   **Pros:** Public-key cryptography enables authentication and key establishment when identities and algorithms are validated.
*   **Cons:** Extremely slow and computationally expensive. It is not feasible to encrypt a 4GB movie using asymmetrical encryption.

---

## 2. Transport Layer Security (TLS)

TLS (the successor to SSL) is the protocol that secures HTTP (making it HTTPS). It brilliantly combines the strengths of both encryption types.

### The Hybrid Approach
1. **Authenticate and agree:** The browser validates the certificate chain, hostname and validity, then verifies possession of the certificate's signing key. Ephemeral ECDHE key shares derive a shared secret; the certificate key authenticates the exchange.
2. **Derive traffic keys:** The handshake transcript and shared secrets feed the version's key schedule (HKDF in TLS 1.3), deriving distinct directional traffic keys.
3. **Protect records:** AEAD such as AES-GCM or ChaCha20-Poly1305 encrypts and authenticates application data. Key updates/resumption have their own derivation rules.

---

## 3. The TLS Handshake: 1.2 vs 1.3

Every time you connect to a secure website, a "handshake" must occur before data can be sent. This adds latency (measured in Round Trips or RTT).

### TLS 1.2 (2-RTT Handshake)
A conventional full TLS 1.2 handshake adds about **two round trips**. Resumption and deployment-specific optimizations differ.
1.  **Client Hello:** "I want to connect securely. Here are the cipher suites (encryption algorithms) I support."
2.  **Server Hello & Certificate:** "Let's use this cipher suite. Here is my Public Key Certificate."
3. **Client Key Exchange:** With ECDHE, the server has sent a signed ephemeral share; the client supplies its share and both derive keys. In legacy RSA transport only, the client encrypts a pre-master secret with the certificate's RSA key.
4. **Finished messages:** Both verify handshake integrity before normal protected application exchange.
5.  *Now HTTP data (like `GET /index.html`) can finally be sent.*

### TLS 1.3 (1-RTT Handshake)
TLS 1.3 was a massive upgrade released in 2018. It optimizes the handshake to just **one round trip**.
1.  **Client Hello + Key Share:** The client essentially *guesses* the encryption algorithm the server will pick (usually a modern one like Elliptic Curve Diffie-Hellman) and sends its part of the mathematical key exchange in the very first message. "I want to connect, I assume we are using this algorithm, so here is my half of the key math."
2. **Server Hello and authentication:** The server selects a key share, derives handshake keys, and sends encrypted authentication/Finished messages. Its ephemeral agreement key and certificate signing key serve different purposes.
3. **Client Finished and application data:** After validating the server, the client completes the handshake and sends protected data.

**Why TLS 1.3 is better:**
*   **Speed:** Halves the connection latency (crucial for mobile networks or high-latency connections).
*   **Security:** Removed support for outdated, vulnerable cryptographic algorithms (like MD5 or SHA-1) that were kept in TLS 1.2 for backwards compatibility.
* **0-RTT Resumption:** With a valid PSK/ticket, the client derives new early traffic keys from the PSK and transcript and sends data in its first flight. Early data can be replayed and lacks forward secrecy, so applications restrict it to replay-tolerant operations.

**Primary reference:** [RFC 8446: TLS 1.3 and 0-RTT considerations](https://www.rfc-editor.org/rfc/rfc8446.html).
