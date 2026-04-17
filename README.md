# CV Bucket

CV Bucket is a full-stack CV indexing and search platform built with Vite, React, TypeScript, Tailwind CSS, Firebase Authentication, Firestore, Cloudflare R2, and an Express API. Recruiters can upload PDF resumes, parse them into structured data, store metadata securely, and search candidates by skill, name, or keyword.

## Stack

- Frontend: Vite, React 19, TypeScript, Tailwind CSS, Firebase Auth, Axios
- Backend: Express, TypeScript, Firebase Admin, Firestore, Cloudflare R2 (S3 API), `pdf-parse`
- Search: Firestore-backed metadata with server-side fuzzy search using `fuse.js`

## Features

- Email/password and Google sign-in with Firebase Authentication
- Protected dashboard with upload, search, preview, download, and delete flows
- Drag-and-drop PDF upload with progress feedback
- Secure backend upload to Cloudflare R2
- PDF parsing and structured data extraction for:
  - Name
  - Email
  - Phone
  - Skills
  - Experience
  - Education
  - Raw text
- Firestore persistence in the `cvs` collection
- Keyword, candidate name, and skills filtering
- Pagination and keyword highlighting in the UI

## Project Structure

```text
src/
  components/
  context/
  hooks/
  pages/
  services/
  types/
  utils/
server/
  config/
  controllers/
  middleware/
  routes/
  services/
  types/
  utils/
```

## Firebase Setup

1. Create a Firebase project in the [Firebase console](https://console.firebase.google.com/).
2. In `Authentication > Sign-in method`, enable:
   - Email/Password
   - Google
3. In `Project settings > General`, create a Web App and copy the frontend config values into `.env`.
4. In `Firestore Database`, create a database in production mode.
5. Create a service account:
   - Open `Project settings > Service accounts`
   - Generate a new private key
   - Either point `FIREBASE_SERVICE_ACCOUNT_PATH` to the downloaded JSON file
   - Or map `project_id`, `client_email`, and `private_key` into `.env.server`
   - Or compress the full JSON into `FIREBASE_SERVICE_ACCOUNT_KEY`
6. Add your local origin, for example `http://localhost:5173`, to Firebase Authentication authorized domains.

## Cloudflare R2 Setup

1. Create an R2 bucket in the [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Generate an API token with read/write access for the bucket.
3. Copy:
   - `R2_ACCESS_KEY`
   - `R2_SECRET_KEY`
   - `R2_BUCKET`
   - `R2_ENDPOINT`
4. Optional but recommended:
   - Configure a public bucket URL or custom domain
   - Set it as `R2_PUBLIC_URL_BASE`
5. If you keep the bucket private, the API still returns temporary signed download URLs for the frontend.

## Environment Files

Frontend example: [`.env.example`](/Users/usesinspiration/Development/Projects/cv-bucket/.env.example)

Backend example: [`.env.server.example`](/Users/usesinspiration/Development/Projects/cv-bucket/.env.server.example)

Recommended local setup:

1. Create `.env` from `.env.example`
2. Create `.env.server` from `.env.server.example`
3. Merge the server variables into your shell environment before starting the API, or place them in `.env` if you prefer one local env file for both processes
4. For local development, prefer `VITE_API_URL=/api` so Vite proxies API traffic to the backend and avoids browser CORS checks

## Install and Run

1. Install dependencies:

```bash
npm install
```

2. Start the frontend and backend in parallel:

```bash
npm run dev
```

3. Open [http://localhost:5173](http://localhost:5173)

## Production Build

```bash
npm run build
npm run start
```

This builds the React app and compiles the Express server into `server/dist`.

## API Overview

- `GET /api/health`
- `GET /api/cvs`
- `GET /api/cvs/:id`
- `POST /api/cvs/upload`
- `DELETE /api/cvs/:id`

All `/api/cvs` routes require a Firebase bearer token.

## Firestore Data Shape

Collection: `cvs`

```ts
{
  id: string
  userId: string
  fileUrl: string
  objectKey: string
  fileName: string
  fileSize: number
  name: string
  email: string
  phone: string
  skills: string[]
  experience: string
  education: string
  rawText: string
  createdAt: Timestamp
}
```

## Security Notes

- Firebase ID tokens are verified on the backend before any CV operation.
- R2 credentials never reach the frontend.
- Uploads are limited to PDFs and capped by `MAX_UPLOAD_SIZE_MB`.
- CV documents are isolated by `userId` on every read and write.

## Next Improvements

- Swap fuzzy search for Algolia or Meilisearch if your dataset becomes large
- Add Firestore composite indexes if you move filtering into database queries
- Improve section extraction with an LLM or custom NLP pipeline for higher accuracy
