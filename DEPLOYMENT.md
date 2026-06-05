# Deployment Setup (Vercel + Render/Railway)

This repo is a monorepo:

- Frontend: `frontend/` on Vercel
- Backend: `backend/` as a Node/Express web service
- Production frontend API env: `NEXT_PUBLIC_API_URL=https://YOUR_BACKEND_DOMAIN/api`

Do not set `NEXT_PUBLIC_API_URL` to the backend root without `/api`.

## 1) Backend on Render

1. Push code to GitHub.
2. Go to Render -> New -> Blueprint and select this repo.
3. Render will read `render.yaml`.
4. Confirm service settings:
   - Name: `badamclasses-backend`
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm run start`
   - Health Check Path: `/api/health`
5. Add required secret environment variables from `backend/production.env.example`:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `FRONTEND_URL=https://YOUR_VERCEL_FRONTEND_URL`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `OPENAI_API_KEY`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
6. Deploy.
7. Copy the Render backend URL, for example:
   - `https://badamclasses-backend.onrender.com`

Render sets `PORT` automatically. Keeping `PORT=5000` is harmless, but it is not required on Render.

## 2) Backend on Railway

1. Push code to GitHub.
2. Go to Railway -> New Project -> Deploy from GitHub repo.
3. Set the service Root Directory to `backend`.
4. Railway will read `backend/railway.json`.
5. Add variables from `backend/production.env.example`.
6. Generate a Railway domain.
7. Confirm health opens:
   - `https://YOUR_RAILWAY_BACKEND_DOMAIN/api/health`

Use either Render or Railway, not both, unless you intentionally want two backend services.

## 3) Frontend on Vercel

1. Go to Vercel -> New Project -> import the GitHub repo.
2. Root Directory: `frontend`.
3. Build Command: `npm run build`.
4. Output Directory: leave blank/default for Next.js.
5. Install Command: `npm install`.
6. Add env var:
   - `NEXT_PUBLIC_API_URL=https://YOUR_BACKEND_DOMAIN/api`
7. Deploy.

`NEXT_PUBLIC_API_URL` is required for production. If it is missing, browser-side API calls fail clearly instead of trying to call `localhost`.

After the first Vercel deploy finishes, copy the frontend domain and update backend `FRONTEND_URL` to match it exactly. If you use both production and preview frontend domains, separate them with commas:

`FRONTEND_URL=https://badamclasses.vercel.app,https://badamclasses-git-main-yourteam.vercel.app`

## 4) MongoDB Atlas

1. Create cluster.
2. Add DB user.
3. Add IP access. Use `0.0.0.0/0` for cloud deploys if you do not have fixed provider IPs.
4. Copy the connection string and set it as `MONGO_URI` in Render/Railway.

## 5) Connect Frontend to Backend

1. Confirm backend health works:
   - `https://YOUR_BACKEND_DOMAIN/api/health`
2. In Vercel -> Project -> Settings -> Environment Variables, set:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://YOUR_BACKEND_DOMAIN/api`
   - Environments: Production, Preview, Development as needed
3. Redeploy the Vercel frontend. `NEXT_PUBLIC_` values are baked into the frontend build, so changing the env var requires a new deployment.
4. In backend host env vars, set:
   - `FRONTEND_URL=https://YOUR_VERCEL_FRONTEND_URL`
5. Redeploy or restart the backend after changing `FRONTEND_URL`.

## 6) Verify

From the workspace root:

1. Run `npm run build`.
2. After local services are running, run `npm run verify`.
3. When backend wiring or payment configuration changed, run `npm run health`.

After production deploy:

1. Open the frontend URL.
2. Test API health:
   - `https://YOUR_BACKEND_DOMAIN/api/health`
3. Test public YouTube auto-detect:
   - `https://YOUR_BACKEND_DOMAIN/api/live-status?url=https%3A%2F%2Fwww.youtube.com%2F%40yourhandle%2Flive`
4. Test unlisted/direct YouTube embed:
   - `https://YOUR_BACKEND_DOMAIN/api/live-status?url=https%3A%2F%2Fyoutu.be%2FVIDEO_ID`
5. Test core frontend routes:
   - `/`
   - `/courses`
   - `/login`
   - `/signup`
   - `/checkout?course=demo-course`
6. Test login/signup:
   - `/dashboard` should require auth or show the correct logged-in state.
7. Test admin/instructor protection:
   - `/admin`
   - `/instructor`
8. Test batches/live:
   - `/batches`
   - a course detail page with a live class URL
9. Test uploads:
   - Login as admin/instructor.
   - Upload a course/banner/poster image.
   - Confirm the returned URL is Cloudinary-backed and the preview renders.
10. Test payments:
   - UPI validation
   - QR checkout
   - Razorpay checkout
   - Duplicate enrollment handling

## 7) Common Production Values

Render backend URL example:

`https://badamclasses-backend.onrender.com`

Vercel frontend env value:

`NEXT_PUBLIC_API_URL=https://badamclasses-backend.onrender.com/api`

Backend CORS env value:

`FRONTEND_URL=https://badamclasses.vercel.app`

## 8) Optional Custom Domain

Add a custom domain on Vercel and Render/Railway, then update both:

- Vercel: `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api`
- Backend host: `FRONTEND_URL=https://yourdomain.com`
