# WebSockets Crash Course

**Source:** [WebSockets Crash Course - Handshake, Use-cases, Pros & Cons and more](https://www.youtube.com/watch?v=2Nt-ZrNP22A) by *Hussein Nasser*

**TL;DR:** WebSockets provide a persistent, bi-directional, full-duplex communication channel between a client and a server over a single TCP connection, fully compatible with HTTP ports (80/443).

---

## 1. Introduction & Motivation (Why WebSockets?)

Before WebSockets (standardized in 2011), the web operated almost exclusively on the **HTTP protocol**.
HTTP is strictly a **request-response** protocol. The client (browser) must initiate the request, and the server responds. 

### The Problem: Server Push
If a server has new data (like a new chat message or a live sports score), it cannot push it to the client because HTTP doesn't allow the server to initiate communication.

**Historical Workarounds:**
1. **Short Polling:** The client repeatedly asks the server every few seconds: *"Do you have new data?"*.
   - *Problem:* Wastes bandwidth and server CPU (empty responses).
2. **Long Polling:** The client sends a request. The server holds the connection open until it has data to send. Once data is sent, the connection closes, and the client immediately opens a new one.
   - *Problem:* High overhead of establishing new TCP connections constantly, and HTTP headers are heavy.

**The Solution:** A persistent connection where both client and server can send messages to each other at any time (Bi-directional, Full-Duplex).

---

## 2. How WebSockets Work

### The Handshake (HTTP Upgrade)
WebSockets do not re-invent the wheel for connection establishment; they piggyback on HTTP.

1. The client sends a standard HTTP `GET` request to the server.
2. It includes specific headers to request an upgrade:
   ```http
   Connection: Upgrade
   Upgrade: websocket
   Sec-WebSocket-Key: <base64_string>
   ```
3. If the server supports WebSockets, it responds with an `HTTP 101 Switching Protocols` status code.
4. **The Magic:** After the 101 response, the HTTP protocol is discarded. The underlying TCP connection is kept alive, and both parties switch to using the WebSocket binary protocol over that exact same TCP connection.

### Characteristics
* **Stateful:** The server knows exactly which clients are connected at any given time.
* **Low Overhead:** After the handshake, data frames are very lightweight (just a few bytes of overhead), unlike HTTP which sends hundreds of bytes of headers with every request.
* **Ports:** Uses standard HTTP (80) and HTTPS (443) ports, making it firewall-friendly.

---

## 3. Use Cases

You should use WebSockets when your application requires **real-time, low-latency, bi-directional communication**:
* **Chat Applications:** WhatsApp, Slack, Discord.
* **Multiplayer Gaming:** Sending player movements and game state rapidly.
* **Live Feeds / Tickers:** Stock market tickers, live sports updates.
* **Collaborative Editing:** Google Docs (multiple people typing simultaneously).
* **Live Location Tracking:** Uber, food delivery apps.

---

## 4. Pros & Cons

### Pros ✅
* **True Full-Duplex:** Client and server can talk simultaneously.
* **Low Latency & Low Bandwidth:** Eliminates the heavy HTTP headers for subsequent messages.
* **Standardized:** Supported by all modern browsers and load balancers.

### Cons ❌
* **Stateful Architecture:** Scaling WebSockets is hard. If you have 1 million concurrent users, your server must hold 1 million open TCP connections. 
* **Load Balancing is Complex:** Standard HTTP load balancing (Round Robin) doesn't work well because connections are persistent. You must ensure connections aren't dropped and that messages meant for a specific client are routed to the specific backend server holding their TCP connection (often requiring a Pub/Sub system like Redis).
* **Timeouts & Proxies:** Some corporate firewalls, proxies, or older load balancers aggressively kill idle TCP connections, forcing the client to reconnect frequently.

---

## 5. Comparison: WebSockets vs Server-Sent Events (SSE)

| Feature | WebSockets | Server-Sent Events (SSE) | Long Polling |
| :--- | :--- | :--- | :--- |
| **Direction** | Bi-directional (Client ↔ Server) | Uni-directional (Server → Client) | Uni-directional (Server → Client) |
| **Protocol** | WS / WSS (over TCP) | HTTP | HTTP |
| **Data Format** | Binary or Text | Text only (UTF-8) | Any |
| **Best For** | Chat, Gaming, Live Collab | Stock tickers, News feeds, Notifications | Legacy fallbacks |
| **Complexity** | High (Stateful scaling) | Low (Standard HTTP) | Low |

*(Note: If you only need the server to push data to the client—like live score updates—SSE is often a simpler and better choice than WebSockets because it relies on standard HTTP).*
