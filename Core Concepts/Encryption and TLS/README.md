# Encryption & Transport Layer Security (TLS)

**Sources:** 
- [Symmetrical vs Asymmetrical Encryption (Hussein Nasser)](https://www.youtube.com/watch?v=Z3FwixsBE94)
- [Transport Layer Security, TLS 1.2 and 1.3 Explained (Hussein Nasser)](https://www.youtube.com/watch?v=AlE5X1NlHgg)

**TL;DR:** Secure web communication (HTTPS) relies on TLS. TLS is a hybrid protocol that uses **Asymmetrical Encryption** to securely establish a connection and exchange a shared key, and then switches to **Symmetrical Encryption** to encrypt the actual data stream for high performance.

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
*   **Common Algorithms:** RSA, Elliptic Curve Cryptography (ECC).
*   **Pros:** Solves the key exchange problem. You can openly publish your Public Key on the internet without compromising your security.
*   **Cons:** Extremely slow and computationally expensive. It is not feasible to encrypt a 4GB movie using asymmetrical encryption.

---

## 2. Transport Layer Security (TLS)

TLS (the successor to SSL) is the protocol that secures HTTP (making it HTTPS). It brilliantly combines the strengths of both encryption types.

### The Hybrid Approach
1.  **The Handshake (Asymmetrical):** When your browser connects to a server, they use slow, secure asymmetrical encryption. The server sends its Public Key (embedded in its SSL Certificate). The browser uses this Public Key to securely send a newly generated **"Session Key"** to the server.
2.  **The Data Transfer (Symmetrical):** Because only the server has the Private Key, only the server can decrypt that Session Key. Now, both the browser and server have the exact same Session Key. They discard asymmetrical encryption and use fast, symmetrical encryption (AES) with that Session Key for the rest of the visit. 

---

## 3. The TLS Handshake: 1.2 vs 1.3

Every time you connect to a secure website, a "handshake" must occur before data can be sent. This adds latency (measured in Round Trips or RTT).

### TLS 1.2 (2-RTT Handshake)
In TLS 1.2, establishing a secure connection takes **two full round trips** between the client and server before a single byte of HTTP data is sent.
1.  **Client Hello:** "I want to connect securely. Here are the cipher suites (encryption algorithms) I support."
2.  **Server Hello & Certificate:** "Let's use this cipher suite. Here is my Public Key Certificate."
3.  **Client Key Exchange:** The client generates the symmetrical Session Key, encrypts it with the server's Public Key, and sends it: "Here is the key we will use. I'm finished."
4.  **Server Finished:** The server decrypts the Session Key and acknowledges: "Got it. I'm finished."
5.  *Now HTTP data (like `GET /index.html`) can finally be sent.*

### TLS 1.3 (1-RTT Handshake)
TLS 1.3 was a massive upgrade released in 2018. It optimizes the handshake to just **one round trip**.
1.  **Client Hello + Key Share:** The client essentially *guesses* the encryption algorithm the server will pick (usually a modern one like Elliptic Curve Diffie-Hellman) and sends its part of the mathematical key exchange in the very first message. "I want to connect, I assume we are using this algorithm, so here is my half of the key math."
2.  **Server Hello + Finished:** The server agrees, completes the key math using its own Private Key, and responds: "Agreed, the key is established. I'm finished."
3.  *The client can immediately send HTTP data.*

**Why TLS 1.3 is better:**
*   **Speed:** Halves the connection latency (crucial for mobile networks or high-latency connections).
*   **Security:** Removed support for outdated, vulnerable cryptographic algorithms (like MD5 or SHA-1) that were kept in TLS 1.2 for backwards compatibility.
*   **0-RTT Resumption:** If you have visited a site recently, TLS 1.3 allows the client to use the previous session key to send HTTP data on the very first network packet (Zero Round Trip Time), making reconnections nearly instantaneous.
