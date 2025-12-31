# HackOmania Backend

Minimal backend for HackOmania with authentication support.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env`:

```bash
cp env.example .env
```

3. Update `.env` with your configuration:

- `MONGO_URL`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `SESSION_SECRET`: Secret key for sessions
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `BACKEND_BASE_URL`: Backend URL (default: http://localhost:5003)
- `FRONTEND_URL`: Frontend URL (default: http://localhost:5173)
- `VAPID_PUBLIC_KEY`: VAPID public key for web push notifications (generate with: `node src/scripts/generateVapidKeys.js`)
- `VAPID_PRIVATE_KEY`: VAPID private key for web push notifications (keep secret!)
- `VAPID_EMAIL`: Email address for VAPID (format: `mailto:your-email@example.com`)

## Running

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

## Endpoints

### Authentication

- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `GET /auth/google/url?role=student` - Get Google OAuth URL
- `GET /auth/google/callback` - Google OAuth callback
- `POST /auth/logout` - Logout

### Users

- `GET /users/me` - Get current user profile (requires auth)
- `PUT /users/me` - Update user profile (requires auth)
- `POST /users/upload-resume` - Upload resume (requires auth, student only)
- `GET /users/download-resume` - Download resume (requires auth, student only)
- `DELETE /users/delete-resume` - Delete resume (requires auth, student only)
