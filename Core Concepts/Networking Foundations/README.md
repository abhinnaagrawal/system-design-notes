# Networking Foundations: OSI, NAT, Proxies, and Load Balancing

**Sources (Hussein Nasser Crash Courses):** 
- [The OSI Model - Explained by Example](https://www.youtube.com/watch?v=7IS7gigunyI)
- [Network Address Translation - NAT Explained](https://www.youtube.com/watch?v=RG97rvw1eUo)
- [Proxy vs. Reverse Proxy (Explained by Example)](https://www.youtube.com/watch?v=ozhe__GdWC8)
- [Load balancing in Layer 4 vs Layer 7 with HAPROXY Examples](https://www.youtube.com/watch?v=aKMLgFVxZYk)

---

## 1. The OSI Model (How Data Moves)
The OSI (Open Systems Interconnection) model is a conceptual framework defining how data travels from an application on one computer across a network to an application on another. 

While there are 7 layers, system design heavily focuses on three:
*   **Layer 3 (Network Layer):** Deals with **IP Addresses**. It routes packets of data between different networks. It knows *which machine* the data is going to, but not what to do with it once it gets there.
*   **Layer 4 (Transport Layer):** Deals with **TCP and UDP Ports**. It ensures data arrives reliably (TCP) or quickly (UDP). It routes the packet to a specific *process* (like a web server listening on Port 80) on the destination machine.
*   **Layer 7 (Application Layer):** Deals with the actual content of the message (**HTTP, WebSockets, gRPC**). It understands headers, JSON payloads, and URL paths (like `/api/users`).

---

## 2. NAT (Network Address Translation)
We ran out of IPv4 addresses a long time ago. NAT is the clever hack that saved the internet by allowing multiple devices to share a single Public IP address.

### The Problem
If you have 10 devices in your house, they all have "Private IPs" (e.g., `192.168.1.5`), which are unroutable on the public internet. If your laptop requests a web page from Google, how does Google know where to send the response back?

### How NAT Works (The NAT Table)
1.  Your laptop (`192.168.1.5:4000`) sends an HTTP request to your Router.
2.  The Router intercepts the packet. It strips out your Private IP and replaces it with the Router's **Single Public IP** (e.g., `98.24.12.1`) and assigns a random source port (e.g., `8080`).
3.  The Router records this swap in its **NAT Table**: `[192.168.1.5:4000 <--> 98.24.12.1:8080]`.
4.  The request goes to Google. Google sees the request coming from `98.24.12.1:8080` and sends the response back there.
5.  When the Router receives the response, it looks up `Port 8080` in the NAT Table, finds your laptop's Private IP, rewrites the packet, and forwards it to you. Google never knew your laptop existed.

---

## 3. Forward Proxies vs Reverse Proxies
A proxy is a middleman server that intercepts requests. The difference depends entirely on **who the proxy is protecting**.

### Forward Proxy (Protects the Client)
*   **Use Case:** VPNs, Corporate Firewalls, Tor network.
*   **Mechanism:** Sits in front of the **Client**. When you try to access a website, your request goes to the Forward Proxy first. The proxy fetches the website on your behalf and returns it to you.
*   **Result:** The destination server only sees the IP address of the Proxy. It has no idea who the real Client is.

### Reverse Proxy (Protects the Server)
*   **Use Case:** NGINX, HAProxy, AWS Application Load Balancer.
*   **Mechanism:** Sits in front of the **Backend Servers**. When a client accesses a website, they are actually connecting to the Reverse Proxy. The proxy then forwards the request to the internal servers.
*   **Result:** The Client has no idea how many backend servers exist or what their internal IP addresses are. Used for Load Balancing, SSL Termination, and Caching.

---

## 4. Layer 4 vs Layer 7 Load Balancing
When setting up a Reverse Proxy (like HAProxy) to load balance traffic across your backend servers, you must choose what "Layer" of the OSI model the proxy operates on.

### Layer 4 Load Balancing (Transport)
*   **How it works:** The Load Balancer only looks at the **IP and Port** (e.g., traffic coming to Port 443). It does not decrypt the traffic or look at the HTTP payload. It simply forwards the raw TCP stream to a backend server.
*   **Pros:** **Extremely fast** and consumes very little CPU. It only takes a single TCP connection from the client straight through to the backend.
*   **Cons:** "Dumb" routing. It cannot route traffic based on the URL. If you want `/api/users` to go to Server A, and `/api/payments` to go to Server B, Layer 4 cannot do this because it cannot read the URL.

### Layer 7 Load Balancing (Application)
*   **How it works:** The Load Balancer terminates the TCP connection, decrypts the TLS certificate, and reads the actual **HTTP headers and URL path**. It then establishes a *second, brand new TCP connection* to the chosen backend server.
*   **Pros:** "Smart" routing. Can route based on URL path, HTTP headers, or even cookies (Sticky Sessions).
*   **Cons:** **Slower and CPU intensive**. Maintaining two separate TCP connections (Client <-> Proxy, and Proxy <-> Backend) and decrypting traffic adds latency and server overhead.
