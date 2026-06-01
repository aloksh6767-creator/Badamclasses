# Deployment Setup (Vercel + Render)

## 1) Frontend (Next.js) on Vercel
1. Push code to GitHub.
2. Go to Vercel -> New Project -> import the GitHub repo.
3. Root Directory: `frontend`.
4. Build Command: `npm run build`.
5. Output Directory: leave blank/default for Next.js.
6. Install Command: `npm install`.
7. Add env var:
   - `NEXT_PUBLIC_API_URL=https://YOUR_RENDER_BACKEND_URL/api`
8. Deploy.

`NEXT_PUBLIC_API_URL` is required for production. If it is missing, browser-side API calls fail clearly instead of trying to call `localhost`.

## 2) Backend (Node/Express) on Render
1. Go to Render -> New Web Service.
2. Connect GitHub repo.
3. Root Directory: `backend`.
4. Build Command: `npm install`.
5. Start Command: `npm run start` (or `node src/server.js`).
6. Add environment variables:
   - `PORT=5000`
   - `MONGO_URI=your_mongodb_connection_string`
   - `JWT_SECRET=your_secret`
   - `JWT_EXPIRES_IN=7d`
   - `FRONTEND_URL=https://YOUR_VERCEL_FRONTEND_URL`
   - `OPENAI_API_KEY=your_openai_key`
   - `OPENAI_MODEL=gpt-4o-mini`
   - `YOUTUBE_API_KEY=your_youtube_data_api_key` (for live class auto-status)
   - `STRIPE_SECRET_KEY=...` (if payments enabled)
   - `STRIPE_WEBHOOK_SECRET=...` (if payments enabled)
   - `CLOUDINARY_CLOUD_NAME=...`
   - `CLOUDINARY_API_KEY=...`
   - `CLOUDINARY_API_SECRET=...`
   - `TELEGRAM_BOT_TOKEN=...` (for phone alerts)
   - `TELEGRAM_CHAT_ID=...` (for phone alerts)
7. Deploy service.

## 3) MongoDB Atlas
1. Create cluster.
2. Add DB user.
3. Add IP access (`0.0.0.0/0` for cloud deploy or restricted IPs).
4. Copy connection string and set as `MONGO_URI` in Render.

## 4) CORS Check
- Ensure backend uses `FRONTEND_URL` matching deployed Vercel domain.

## 5) Verify
- From the workspace root, run `npm run build`.
- After local services are running, run `npm run verify`.
- When backend wiring or payment configuration changed, run `npm run health`.
- Open frontend URL.
- Test API health: `https://YOUR_RENDER_BACKEND_URL/api/health`.
- Test YouTube live status: `https://YOUR_RENDER_BACKEND_URL/api/live-status?url=https%3A%2F%2Fwww.youtube.com%2F%40yourhandle%2Flive`.
- Test home, `/courses`, `/login`, `/signup`, and `/checkout?course=demo-course`.

## 6) Optional Custom Domain
- Add domain on Vercel and Render.
- Update `NEXT_PUBLIC_API_URL` and `FRONTEND_URL` accordingly.
