# Geospatial Indexes: Proximity Search & Location Databases

**Sources:** 
- [Proximity Search & Geospatial Indexes Explained (Hello Interview)](https://www.youtube.com/watch?v=dQXdSxn7d1g)
- [Designing a location database: QuadTrees and Hilbert Curves (Gaurav Sen)](https://www.youtube.com/watch?v=OcUKFIjhKu0)

**TL;DR:** When building systems like Uber, Yelp, or Tinder, you must query for items "nearby" a user's `(latitude, longitude)`. Standard database indexes (B-Trees) fail at 2D queries. The industry has converged on two solutions: build a **Custom Spatial Tree** (Quad, KD, R-Tree) or map 2D space into 1D integers using **Encoded Keys** (GeoHash, S2, H3) to drop into a standard B-Tree.

---

## 1. The Core Problem: Why Standard Databases Fail
Imagine a SQL table of taxi cabs with `lat` and `lng` columns. You want to find all cabs within a 2km radius. 
If you put a standard B-Tree index on `lat` and `lng`, the 1D sort order completely rips apart 2D closeness. 

Take two cabs parked just five blocks away from each other in Midtown Manhattan. Physically, they are neighbors. But if your 1D database index sorts on longitude alone, every single other cab in the city with a longitude between them (from the Bronx all the way down to Staten Island) gets crammed into the index between those two neighbors. 

**Any naive flattening of 2D into 1D rips apart the spatial relationship we actually care about.** We need data structures designed for space.

---

## 2. Approach A: Custom Spatial Trees (The Evolution)

To solve this, computer scientists spent decades building custom trees designed specifically for spatial coordinates.

### 1. QuadTrees (1974 - Finkel & Bentley)
*   **What it does:** It divides a square map into 4 smaller squares, and recursively shatters them if an area gets too crowded.
*   **How it works:** The split always happens at the **geometric midpoint** of the cell (North/South, East/West). 
*   **The Flaw (Latency & Disk Thrashing):** Because the split is purely geometric and ignores where the data actually sits, a highly dense area like Manhattan gets sliced in half over and over (dozens of levels deep) just to separate the points. This makes query latency unpredictable (a query in rural Vermont is instantly fast, but Manhattan is painfully slow). Furthermore, it is a pointer-based structure; following arbitrary memory pointers causes massive random disk reads (thrashing) when the tree exceeds RAM.

### 2. KD-Trees (1975 - Bentley)
*   **What it does:** A binary tree that alternates splitting the map vertically (X-axis) and horizontally (Y-axis) at every level.
*   **How it works:** Unlike QuadTrees, KD-Trees are data-driven. They split the space at the **median** point of the data, ensuring the binary tree remains perfectly balanced regardless of density.
*   **The Flaw:** It solved the density latency problem, but it still suffered from the same disk-thrashing pointer problem as QuadTrees. It is great in-memory, but painful off of it.

### 3. BKD-Trees (Block-oriented KD-Trees)
*   **What it does:** The modern fix for KD-Trees, specifically designed to live on a physical hard drive rather than RAM.
*   **How it works:** Instead of storing one point per node (which forces the hard drive to spin wildly reading pointers), BKD-Trees pack thousands of points into large "Blocks" that perfectly match the OS disk page size. 
*   **Usage:** Elasticsearch uses BKD trees for its geo-queries today, making it excellent for searching static data (like restaurants), but terrible for live-tracking moving cars (because it is designed for write-once immutable segments).

### 4. R-Trees (1984 - Antonin Guttman)
*   **What it does:** It was the first spatial index designed to handle **shapes** (lines, polygons), not just points. 
*   **How it works:** You can't meaningfully drop a polygon (like the country of France) into a QuadTree cell. Instead, an R-Tree draws a **Minimum Bounding Rectangle (MBR)** tightly around geometric objects. It then groups those rectangles inside larger parent rectangles, forming a balanced tree similar to a B-Tree. 
*   **Usage:** Used by PostgreSQL (PostGIS) to answer complex geometry questions (e.g., "Does this delivery zone polygon intersect with Highway 66?"). 
*   **The Flaw:** Writes are incredibly expensive. When an object moves, the tree has to recalculate bounding boxes to minimize overlap.

---

## 3. Approach B: Encoded Keys (Space-Filling Curves)
Instead of building complex new trees, this approach translates a 2D `(lat, lng)` coordinate into a single 1D integer. You can then drop that integer into a standard, blazingly fast B-Tree (which databases have spent 50 years optimizing).

The goal is to use a **Space-Filling Curve** (like a Hilbert Curve) to draw a continuous line through a 2D grid so that points that are physically close together in 2D space are numerically close together on the 1D line.

### Hilbert Curves (The Math)
*   **How it works:** It uses a recursive 'U' shape to fill a 2D space. At level 1, you have a simple 'U'. At level 2, the grid is subdivided, and you draw 4 smaller, rotated 'U's connected together. You can do this to infinite depth.
*   **The Magic:** Because it is a continuous line, every point in the 2D plane is mapped to an integer position on the line. If two points are physically close in the real world, their 1D integers are almost guaranteed to be very close. 
*   **The Query:** To find nearby drivers, you calculate the user's 1D Hilbert value (e.g., `29`), and do a simple database range query: `SELECT * FROM drivers WHERE hilbert_id BETWEEN 23 AND 35`.

### 1. GeoHash (Redis)
*   **How it works:** Divides a flat 2D map into a grid of squares. Converts coordinates into a 52-bit integer (often represented as a base32 string like `dr5ru`). Points sharing a prefix are geographically close.
*   **The Flaw:** The Earth is a sphere, not a flat rectangle. A GeoHash square at the equator is huge, but a GeoHash square near the North Pole is a tiny sliver.
*   **Usage:** Redis `GEOADD` and `GEORADIUS` use 52-bit GeoHash integers stored in a Sorted Set (a B-Tree variant).

### 2. Google S2 (MongoDB)
*   **How it works:** Solves the GeoHash pole-distortion problem. S2 wraps the spherical Earth in a 3D cube, then projects the surface onto the 6 flat faces of the cube. It then uses a **Hilbert Curve** to assign a 64-bit integer (`S2 Cell ID`) to every point.
*   **Usage:** Powers MongoDB's `2dsphere` index.

### 3. Uber H3
*   **How it works:** Uses **Hexagons** instead of squares. 
*   **The Problem with Squares:** A square has 4 edge neighbors (close) and 4 corner neighbors (further away). This asymmetry makes radius queries and heat maps messy.
*   **The Hexagon Solution:** A hexagon has exactly 6 neighbors, all at the *exact same distance* from the center. H3 tiles the globe in hexagons, assigning a 64-bit ID to each based on a deterministic walk. 
*   **Usage:** Used internally by Uber for dispatch and surge pricing analytics.

---

## 4. The Edge Case: Boundary Artifacts
All Encoded Key approaches (GeoHash, S2, H3) suffer from the **Boundary Problem**.
Two points can be 5 meters apart, but if they straddle the boundary of a massive parent cell (e.g., the Prime Meridian), their 1D integers will be completely different. A naive B-Tree prefix scan will miss them entirely.

**The Fix (The 3x3 Trick):**
When querying, you don't just query the user's cell. You mathematically calculate the 8 neighboring cells around the user, and query all 9 cells. You then post-filter the results to drop the corners that are technically inside the 9 cells but outside your actual target radius.

---

## 5. Summary: What should you use?

| Scenario | Recommendation | Underlying Tech | Writes |
| :--- | :--- | :--- | :--- |
| **Complex Geometries (Polygons, Lines)** | PostgreSQL (PostGIS) | Custom R-Trees | Slow (Rebalancing) |
| **Text Search + Static Locations** | ElasticSearch | Custom BKD-Trees | Write-Once |
| **Massive Scale Live Tracking (Uber)** | Redis / Custom DB | GeoHash / H3 (B-Tree) | Blazing Fast |

