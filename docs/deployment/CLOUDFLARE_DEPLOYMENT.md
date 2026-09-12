# Deploying Paytm Merchant Autopilot Backend with Cloudflare

This guide walks you through deploying the containerized Node.js/Express backend to a cloud host and placing **Cloudflare (DNS, SSL/TLS, DDoS Protection & CDN)** in front.

---

## 🏛️ Architecture

```text
 Client / Phinite Tools
           ↓ (HTTPS Request)
   Cloudflare Edge Network
   - DNS Resolution (api.yourdomain.com)
   - SSL/TLS Termination (Full Strict)
   - DDoS & WAF Protection (API Shield)
   - Cache Rules (Bypass for /api/*)
           ↓ (Secure Proxy / CNAME)
  Container Host (Render / Railway / Fly.io / VPS)
  - Runs backend/Dockerfile (Node.js + Express)
  - Port auto-configured
           ↓ (Database Connection)
    MongoDB Atlas Cluster
```

---

## Step 1: Deploy the Container to a Cloud Host

You can deploy `backend/Dockerfile` to any container platform. The two simplest free/low-cost platforms connected directly to GitHub are **Render** and **Railway**:

### Option A: Deploy with Render (Free tier available)
1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository: `bhangalesoham2606/paytm-merchant-autopilot`.
4. Configure service:
   - **Name**: `paytm-merchant-autopilot-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `Dockerfile`
   - **Docker Context**: `.`
5. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `<Your MongoDB Atlas connection string>` (e.g. `mongodb+srv://user:pass@cluster0.mongodb.net/paytm_autopilot?retryWrites=true&w=majority`)
   - `CORS_ORIGIN`: `*`
6. Click **Create Web Service**. Render will build the Docker container and provide a live URL like:  
   `https://paytm-merchant-autopilot-backend.onrender.com`

---

### Option B: Deploy with Railway
1. Go to [Railway.app](https://railway.app).
2. Click **New Project** > **Deploy from GitHub repo**.
3. Select `paytm-merchant-autopilot`.
4. In Service Settings:
   - **Root Directory**: `/backend`
   - **Builder**: `Docker` (it will auto-detect `backend/Dockerfile`)
5. Under **Variables**, add `MONGODB_URI` and `NODE_ENV=production`.
6. Railway will generate a public domain (e.g., `https://paytm-backend.up.railway.app`).

---

## Step 2: Configure Cloudflare DNS & Proxy

Now connect your custom domain in Cloudflare to route all traffic securely to your cloud container.

1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Select your domain (e.g. `yourdomain.com`).
3. Navigate to **DNS** > **Records**.
4. Click **Add record**:
   - **Type**: `CNAME`
   - **Name**: `api` (or `@` for root)
   - **Target**: Your container host URL (e.g., `paytm-merchant-autopilot-backend.onrender.com` or your Railway domain)
   - **Proxy status**: **Proxied** (Orange Cloud ☁️ active)
   - **TTL**: `Auto`
5. Click **Save**.

---

## Step 3: Configure Cloudflare SSL/TLS & Rules

To ensure reliable, non-stale API communication for Phinite agents:

### 1. SSL/TLS Encryption
- In Cloudflare, go to **SSL/TLS** > **Overview**.
- Select **Full** or **Full (Strict)** encryption.

### 2. Disable Edge Caching for Dynamic APIs
Because the backend computes live deterministic metrics and transactions, API requests must never be cached at the Cloudflare edge:
- Go to **Rules** > **Page Rules** (or **Cache Rules**).
- Click **Create Page Rule**:
  - **URL Match**: `api.yourdomain.com/api/*`
  - **Settings**:
    - **Cache Level**: `Bypass`
    - **Security Level**: `Medium`
- Click **Save and Deploy**.

### 3. Rate Limiting (Optional but Recommended)
- Go to **Security** > **WAF** > **Rate Limiting Rules**.
- Add a rule to allow up to 120 requests/minute per IP to prevent abusive traffic while supporting frequent Phinite tool queries.

---

## Step 4: Verification

Once DNS propagates (usually within 1–2 minutes):

Test your Cloudflare-protected endpoint using curl:
```bash
curl -X GET "https://api.yourdomain.com/api/health"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "paytm-merchant-autopilot-backend"
  }
}
```

Inspect the response headers:
```bash
curl -I "https://api.yourdomain.com/api/health"
```
You will see Cloudflare headers confirming the connection is proxied:
```http
server: cloudflare
cf-ray: ...
cf-cache-status: BYPASS
```

---

## Quick Alternative: Cloudflare Tunnel (For Instant Local Demo)

If you are running the backend locally on port 4000 and want an instant, public Cloudflare HTTPS URL without hosting accounts:

```bash
# 1. Download or run cloudflared
npx cloudflared tunnel --url http://localhost:4000
```
Cloudflare will output a public URL like:
`https://random-words.trycloudflare.com`

You can plug `https://random-words.trycloudflare.com` directly into your Phinite tools!
