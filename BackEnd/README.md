# World Quiz Backend

Express.js + TypeScript + PostgreSQL backend with JWT and Google OAuth authentication.

## Features

- ✅ User registration with username/password
- ✅ Login with email/password
- ✅ Google OAuth 2.0 authentication
- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ PostgreSQL database
- ✅ Rate limiting
- ✅ Security headers (Helmet)
- ✅ CORS configuration
- ✅ Input validation

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Setup

### 1. Install Dependencies

```powershell
cd BackEnd
npm install
```

### 2. Configure Database

Create a PostgreSQL database:

```sql
CREATE DATABASE world_quiz;
```

### 3. Environment Variables

Copy `.env.example` to `.env` and configure:

```powershell
copy .env.example .env
```

Edit `.env` with your values:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=world_quiz
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=generate-a-strong-random-secret

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Run Migrations

```powershell
npm run db:migrate
```

### 5. Start Development Server

```powershell
npm run dev
```

The server will run on `http://localhost:3000`

## API Endpoints

### Authentication

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### Google OAuth
```
GET /api/auth/google
```

Redirects to Google OAuth consent screen.

#### Get Profile (Protected)
```
GET /api/auth/profile
Authorization: Bearer <token>
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback`
6. Copy Client ID and Secret to `.env`

## Database Schema

### Users Table
```sql
- id (SERIAL PRIMARY KEY)
- username (VARCHAR UNIQUE)
- email (VARCHAR UNIQUE)
- password_hash (VARCHAR) - null for OAuth-only accounts
- google_id (VARCHAR UNIQUE) - null for local accounts
- display_name (VARCHAR)
- avatar_url (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- last_login (TIMESTAMP)
- is_active (BOOLEAN)
```

### Scores Table
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER REFERENCES users)
- game_mode (VARCHAR)
- score (INTEGER)
- total_questions (INTEGER)
- time_taken (INTEGER)
- created_at (TIMESTAMP)
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:migrate` - Run database migrations

## Security Features

- Password requirements: min 8 chars, uppercase, lowercase, number
- JWT tokens with expiration
- Rate limiting (100 requests per 15 minutes)
- Helmet security headers
- CORS protection
- Input validation and sanitization

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Configure production database
4. Set up SSL/HTTPS
5. Configure production `FRONTEND_URL`
6. Build the app: `npm run build`
7. Start with: `npm start`
