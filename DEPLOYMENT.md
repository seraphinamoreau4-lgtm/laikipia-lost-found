# Deployment Guide: Laikipia Lost & Found

Deploy your full-stack app to **Vercel (Frontend)** + **Render (Backend + Database)**.

---

## 📋 Prerequisites

Before deploying, ensure:

- ✅ GitHub repository is public or private (linked)
- ✅ `render.yaml`, `vercel.json`, and `.env.example` files are in the repo
- ✅ Backend updated to use PostgreSQL (✓ Done)
- ✅ Environment variables defined

---

## 🚀 Deployment Steps

### **Step 1: Push Changes to GitHub**

```bash
cd c:\Users\paulc\OneDrive\Desktop\LAIKIPIA-LOST-FOUND
git add .
git commit -m "Prepare for production deployment: Add Render/Vercel configs"
git push -u origin main
```

---

### **Step 2: Deploy Backend + Database to Render**

#### Option A: Using Render Dashboard (Easiest)

1. Go to [render.com](https://render.com) and sign up
2. Click **"New +"** → **"Blueprint"**
3. Select **"Public Git Repository"**
4. Paste: `https://github.com/seraphinamoreau4-lgtm/laikipia-lost-found.git`
5. Render automatically reads `render.yaml` and deploys everything!
6. Set environment variables:
   - `JWT_SECRET`: Generate a secure random string (or let Render generate it)
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
   - `FRONTEND_URL`: Will update after frontend deployment

**Backend will be live at:** `https://laikipia-lost-found-backend-xxxxx.onrender.com`

---

#### Option B: Manual Setup (Step-by-step)

1. **Create PostgreSQL Database**
   - Go to Render → **"New +"** → **"PostgreSQL"**
   - Name: `laikipia-db`
   - Region: Choose closest to you
   - Plan: Free tier
   - Save the connection string (you'll need it)

2. **Deploy Backend Service**
   - Go to Render → **"New +"** → **"Web Service"**
   - Connect GitHub repository
   - Name: `laikipia-lost-found-backend`
   - Environment: `Node`
   - Build Command: `npm ci && npm run migrate`
   - Start Command: `npm start`
   - Plan: Free
   - Add Environment Variables:
     ```
     NODE_ENV=production
     DATABASE_URL=<paste_from_database_connection_string>
     JWT_SECRET=<generate_secure_random_string>
     ANTHROPIC_API_KEY=<your_key>
     FRONTEND_URL=https://laikipia-lost-found.vercel.app (update after frontend deploy)
     ```

3. **Verify Backend is Running**
   - Wait 2-3 minutes for deployment
   - Visit: `https://laikipia-lost-found-backend-xxxxx.onrender.com/health` (or your API endpoint)

---

### **Step 3: Deploy Frontend to Vercel**

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click **"Add New..."** → **"Project"**
3. Import Git Repository → Select `laikipia-lost-found`
4. Configure:
   - Framework: `Vite`
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)
5. Add Environment Variables:
   ```
   VITE_API_URL=https://laikipia-lost-found-backend-xxxxx.onrender.com
   ```
6. Click **"Deploy"** and wait 1-2 minutes

**Frontend will be live at:** `https://laikipia-lost-found.vercel.app`

---

### **Step 4: Update Backend with Frontend URL**

1. Go back to Render backend service
2. Click **"Environment"**
3. Update `FRONTEND_URL` = `https://laikipia-lost-found.vercel.app`
4. Click **"Save"** - service will auto-redeploy

---

## ✅ Verify Everything Works

- ✅ Frontend loads at `https://laikipia-lost-found.vercel.app`
- ✅ API calls work (check browser Network tab)
- ✅ Database operations function properly
- ✅ Real-time messaging via Socket.io connects
- ✅ File uploads work

---

## 🔐 Environment Variables Checklist

### **Backend (Render)**

- `NODE_ENV=production`
- `DATABASE_URL=postgresql://...` (auto from Render DB)
- `JWT_SECRET=your-secret-key`
- `ANTHROPIC_API_KEY=your-key`
- `FRONTEND_URL=https://laikipia-lost-found.vercel.app`
- `PORT=5000`

### **Frontend (Vercel)**

- `VITE_API_URL=https://laikipia-lost-found-backend-xxxxx.onrender.com`

---

## 🐛 Troubleshooting

| Issue                        | Solution                                     |
| ---------------------------- | -------------------------------------------- |
| 403 GitHub permission error  | Use correct account or create personal token |
| Database connection fails    | Check `DATABASE_URL` format is correct       |
| Frontend can't reach backend | Update `VITE_API_URL` in Vercel env vars     |
| CORS errors                  | Ensure `FRONTEND_URL` is set on backend      |
| Deployment fails             | Check build logs in Render/Vercel dashboard  |

---

## 📈 Next Steps

- Monitor logs in Render/Vercel dashboards
- Set up automatic deployments (both platforms auto-redeploy on git push)
- Enable error tracking (Sentry, LogRocket, etc.)
- Set up database backups
- Configure custom domain (optional)

---

## 🆘 Need Help?

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **PostgreSQL Connection**: https://render.com/docs/postgres
