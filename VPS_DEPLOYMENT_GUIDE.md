# Varun Traders Billing - Complete VPS Deployment Guide (Ubuntu / Hostinger / DigitalOcean)

This guide provides complete, step-by-step instructions to deploy the **Varun Traders Billing** application (React Vite Frontend + Express Node.js Backend on **Port 5011** + **Local MongoDB Server** + Nginx + PM2 + SSL) for your subdomain **`varun-traders-billing.gemshine.tech`**.

---

## 🏗️ Architecture Overview

```
                          Internet (User Request)
                                    │
                                    ▼
       [ Nginx Reverse Proxy (Port 80 / 443 HTTPS SSL) ]
                  Host: varun-traders-billing.gemshine.tech
                                    │
                ┌───────────────────┴───────────────────┐
                │                                       │
     Frontend (/ & /assets/*)                 Backend API (/api/*)
                │                                       │
                ▼                                       ▼
     Static React SPA Files             Express Node.js Server (Port 5011 via PM2)
     (/var/www/varun-trade/dist)                        │
                                        ┌───────────────┴───────────────┐
                                        ▼                               ▼
                              Local MongoDB Server                 Cloudinary
                              (127.0.0.1:27017)                    (Cloud Storage)
```

---

## 🌐 Step 0: Configure DNS Record in Your Domain Registrar
Before generating the SSL certificate, ensure your DNS A-Record is pointed to your VPS:
- **Type**: `A`
- **Name / Host**: `varun-traders-billing` (or full `varun-traders-billing.gemshine.tech`)
- **Points to (Value)**: `YOUR_VPS_IP_ADDRESS`
- **TTL**: Auto / 300s

---

## 💻 Step 1: Connect to VPS & Initial Server Setup

Connect to your VPS via SSH:
```bash
ssh root@YOUR_VPS_IP
```

Update system repositories:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget gnupg ufw nginx
```

### Install Node.js (v20 LTS):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v # Verify: should output v20.x.x
npm -v  # Verify: should output v10.x.x
```

### Install PM2 (Process Manager):
```bash
sudo npm install -g pm2
```

---

## 🍃 Step 2: Install & Configure Local MongoDB on VPS

### 1. Import MongoDB Public GPG Key:
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
  --dearmor --yes
```

### 2. Add MongoDB Repository:
- **For Ubuntu 22.04 (Jammy)**:
```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```
- **For Ubuntu 24.04 (Noble)**:
```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```
- **For Ubuntu 20.04 (Focal)**:
```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```

### 3. Install MongoDB:
```bash
sudo apt update
sudo apt install -y mongodb-org
```

### 4. Start and Enable MongoDB on Boot:
```bash
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```
*(Press `q` to exit status view. It should say **active (running)**).*

---

## 🛡️ Step 3: Configure Firewall (UFW)
Secure your VPS by only exposing necessary web ports. Local MongoDB (27017) and Backend (5011) remain safely internal on `127.0.0.1`.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

---

## 📂 Step 4: Clone the Project to `/var/www/varun-trade`

```bash
sudo mkdir -p /var/www/varun-trade
sudo chown -R $USER:$USER /var/www/varun-trade
cd /var/www/varun-trade

# Clone your repository (or copy your code files):
git clone <YOUR_GIT_REPO_URL> .
```

---

## ⚙️ Step 5: Configure Environment Variables (.env)

### 1. Root `.env` (Frontend build)
```bash
nano .env
```
Paste:
```env
VITE_API_URL=/api
```
*(Press `Ctrl + O` -> `Enter` to save, `Ctrl + X` to exit)*

### 2. Backend `server/.env` (Node.js API Server)
```bash
nano server/.env
```
Paste:
```env
PORT=5011
NODE_ENV=production
MONGODB_URI=mongodb://127.0.0.1:27017/varun_trade_db
CORS_ORIGIN=https://varun-traders-billing.gemshine.tech,http://varun-traders-billing.gemshine.tech
JWT_SECRET=f9a8b7c6d5e4f3g2h1i0j9k8l7m6n5o4p3q2r1s0t9u8v7w6x5y4z3a2b1c
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password123
CLOUDINARY_CLOUD_NAME=daxl7y5um
CLOUDINARY_API_KEY=579937718567788
CLOUDINARY_API_SECRET=e2euCuyOQycviFSHMYhBK-miEKQ
```
*(Press `Ctrl + O` -> `Enter` to save, `Ctrl + X` to exit)*

---

## 🔨 Step 6: Install Dependencies & Build

```bash
cd /var/www/varun-trade

# 1. Install root & client dependencies
npm install

# 2. Install backend dependencies
npm --prefix server install

# 3. Build both React Frontend and Backend TypeScript code
npm run build:all
```

---

## 🚀 Step 7: Start Backend Service with PM2 (Port 5011)

```bash
cd /var/www/varun-trade
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```
*(Execute the command generated on screen by `pm2 startup` if instructed).*

Check backend logs to verify MongoDB connection:
```bash
pm2 status
pm2 logs varun-trade-api --lines 20
```
You should see:
```
[Database] MongoDB Connected Successfully!
[Database Host] 127.0.0.1:27017
[Database Name] varun_trade_db
🚀 Varun Trade Server running on port 5011
```

---

## 🌐 Step 8: Configure Nginx Reverse Proxy

Copy the pre-configured Nginx file:
```bash
sudo cp nginx/varun-traders-billing.gemshine.tech.conf /etc/nginx/sites-available/varun-traders-billing.gemshine.tech
```

Enable the site configuration:
```bash
sudo ln -sf /etc/nginx/sites-available/varun-traders-billing.gemshine.tech /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx syntax:
sudo nginx -t

# Restart Nginx:
sudo systemctl restart nginx
```

---

## 🔒 Step 9: Install Free SSL Certificate (HTTPS) with Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d varun-traders-billing.gemshine.tech
```
- Enter your email address for renewal notifications.
- Agree to the Terms of Service.
- Certbot will automatically configure SSL inside Nginx and enable auto-renewals!

---

## 🧪 Step 10: Verification & Health Check

1. Open your browser and navigate to:
   - **Frontend**: `https://varun-traders-billing.gemshine.tech`
   - **Backend Health Check**: `https://varun-traders-billing.gemshine.tech/api/health`
2. Expected Backend Response:
   ```json
   {
     "status": "OK",
     "message": "Varun Trade API Server is running smoothly",
     "port": "5011",
     "timestamp": "2026-09-17T..."
   }
   ```
3. Login to the application with default credentials:
   - **Username**: `admin`
   - **Password**: `password123`

---

## 💾 Step 11: MongoDB Backups & Maintenance (Local DB)

### To Backup the Database:
```bash
mongodump --db=varun_trade_db --out=/var/backups/mongo-$(date +%F)
```

### To Restore a Backup:
```bash
mongorestore --db=varun_trade_db /var/backups/mongo-YYYY-MM-DD/varun_trade_db
```

---

## ⚡ Future Updates (1-Step Auto Deploy)

Whenever you push code updates to your Git repository:
```bash
cd /var/www/varun-trade
bash deploy.sh
```
This automatically pulls updates, rebuilds the frontend & backend, and reloads PM2 with zero downtime!
