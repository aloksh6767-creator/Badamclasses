# BadamSinghClasses (Premium EdTech Platform)

Tagline: **Learn Smart, Achieve Success**

This workspace includes a complete full-stack scaffold for a paid educational platform.

## Stack
- Frontend: Next.js, React, Tailwind CSS
- Backend: Node.js, Express.js
- Database: MongoDB (Mongoose)
- Auth: JWT
- Payments: Stripe (checkout session + enrollment unlock flow)
- Storage: Cloudinary-ready upload endpoint for video/PDF

## Features Implemented
- Premium dark themed responsive UI
- Home page with hero, featured courses, instructors, testimonials, CTA
- Courses page with search + grid cards
- Course details page with curriculum, review/rating, buy button
- Student dashboard (purchased courses, watch/download, progress tracking, certificate URL)
- Instructor/admin panel (create/manage courses)
- Signup/Login with JWT
- Wishlist APIs + page
- Review and rating system
- Stripe checkout endpoint
- Enrollment unlock endpoint after payment success

## Folder Structure
- `frontend/` Next.js app
- `backend/` Express API

## Quick Start
```bash
npm run up
```

This starts:
- frontend on `http://127.0.0.1:3001`
- backend on `http://127.0.0.1:5000`

It also forces the frontend to use the safer `.next-runtime` folder instead of the default `.next` output.

## Setup

### 1) Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend runs on `http://localhost:5000`.

### 2) Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

## Important Environment Variables
### Backend `.env`
- `MONGO_URI`
- `JWT_SECRET`
- `FRONTEND_URL`
- `STRIPE_SECRET_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

### Frontend `.env.local`
- `NEXT_PUBLIC_API_URL=http://localhost:5000/api`

## Main API Routes
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/courses`
- `GET /api/courses/:id`
- `POST /api/courses/:id/reviews`
- `POST /api/courses/:id/wishlist`
- `POST /api/payments/checkout`
- `POST /api/payments/confirm`
- `GET /api/student/dashboard`
- `GET /api/student/wishlist`
- `POST /api/instructor/courses` (admin)
- `POST /api/upload` (admin, Cloudinary)

## Payment Flow
1. Student clicks Buy on course details page.
2. Frontend calls `/api/payments/checkout`.
3. Stripe returns checkout URL.
4. After success, call `/api/payments/confirm` to create enrollment and unlock course.

## Notes

## Search indexing for `badamclasses.in`

The production canonical URL is `https://www.badamclasses.in`. After the Vercel deployment is complete, use these manual steps to register the domain with search engines:

1. **Bing Webmaster Tools**
   - Add `https://www.badamclasses.in` as a site (or import it from Google Search Console).
   - Verify ownership using the DNS, HTML meta tag, or HTML file method provided by Bing.
   - Submit the sitemap: `https://www.badamclasses.in/sitemap.xml`.
   - Use **URL Submission** to submit the homepage and important new public course URLs after publishing them.

2. **Google Search Console**
   - Add a **Domain property** for `badamclasses.in` and complete the DNS TXT verification shown by Google. This verifies both the apex and `www` versions.
   - Also add the URL-prefix property `https://www.badamclasses.in/` if you want page-level reporting for the canonical host.
   - Submit `https://www.badamclasses.in/sitemap.xml` in **Sitemaps**.
   - Use **URL inspection** for the homepage and important new public pages, then choose **Request indexing** after confirming the live canonical URL.

3. **Vercel domain check**
   - Add both `badamclasses.in` and `www.badamclasses.in` to the same frontend Vercel project.
   - Set `www.badamclasses.in` as the Production Domain. The included Vercel rule redirects the apex host to `www` with HTTP 308 once both domains point to Vercel.
- `role: admin` users can access instructor panel APIs.
- Course completion at 100% progress generates a certificate link.
- Existing root files (`index.html`, `styles.css`) were left untouched.

## Phone Error Alerts
1. Create a Telegram bot using `@BotFather`.
2. Copy the bot token into backend `.env` as `TELEGRAM_BOT_TOKEN`.
3. Send any message to your bot from your phone.
4. Open `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` and copy your `chat.id`.
5. Save that value as `TELEGRAM_CHAT_ID`.

After setup, critical backend failures and frontend runtime crashes will send a Telegram message to your phone.
