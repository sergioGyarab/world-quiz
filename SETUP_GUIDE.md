# World Quiz - Authentication Setup Guide

## 🎯 What We Built

A complete full-stack authentication system with:
- ✅ Username/password registration and login
- ✅ Google OAuth 2.0 authentication
- ✅ JWT-based session management
- ✅ PostgreSQL database
- ✅ Protected routes in React
- ✅ Secure password hashing
- ✅ Input validation
- ✅ Beautiful UI for login/register

## 📁 Project Structure

```
world-quiz/
├── FrontEnd/           # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.tsx       # Login page
│   │   │   ├── Register.tsx    # Registration page
│   │   │   ├── Navbar.tsx      # Navigation bar
│   │   │   └── Auth.css        # Auth styling
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx # Auth state management
│   │   ├── services/
│   │   │   └── api.ts          # API client
│   │   ├── App.tsx             # Main app with routing
│   │   ├── WorldMap.tsx        # Your map component
│   │   └── main.tsx            # Entry point
│   └── .env                     # API URL config
│
└── BackEnd/            # Express + TypeScript + PostgreSQL
    ├── src/
    │   ├── config/
    │   │   ├── index.ts         # Environment config
    │   │   └── passport.ts      # Google OAuth setup
    │   ├── controllers/
    │   │   └── authController.ts # Auth logic
    │   ├── db/
    │   │   ├── index.ts          # Database connection
    │   │   └── migrate.ts        # Database schema
    │   ├── middleware/
    │   │   ├── auth.ts           # JWT verification
    │   │   └── errorHandler.ts  # Error handling
    │   ├── models/
    │   │   └── User.ts           # User database model
    │   ├── routes/
    │   │   └── auth.ts           # Auth API routes
    │   ├── services/
    │   │   └── authService.ts    # Auth business logic
    │   ├── types/
    │   │   └── index.ts          # TypeScript types
    │   └── server.ts             # Express server
    └── .env                      # Backend config
```

## 🚀 Setup Instructions

### Step 1: Install PostgreSQL

**Windows:**
1. Download from: https://www.postgresql.org/download/windows/
2. Run installer, set password for `postgres` user
3. Default port: 5432

**Verify installation:**
```powershell
psql --version
```

### Step 2: Create Database

Open PowerShell and run:
```powershell
psql -U postgres
```

In the PostgreSQL prompt:
```sql
CREATE DATABASE world_quiz;
\q
```

### Step 3: Configure Backend

1. Edit `BackEnd/.env`:
```env
DB_PASSWORD=your_postgres_password_here
JWT_SECRET=generate-a-strong-random-secret-here
```

2. Run database migrations:
```powershell
cd BackEnd
npm run db:migrate
```

You should see:
```
✅ Users table created/verified
✅ Scores table created/verified
✅ All migrations completed successfully
```

### Step 4: Set Up Google OAuth (Optional)

If you want Google Sign-In:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback`
7. Copy Client ID and Client Secret
8. Update `BackEnd/.env`:
```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

**Skip this step** if you only want username/password auth!

### Step 5: Start Development Servers

**Terminal 1 - Backend:**
```powershell
cd BackEnd
npm run dev
```

You should see:
```
✅ Database connected successfully
✅ All migrations completed successfully
🚀 Server running on http://localhost:3000
```

**Terminal 2 - Frontend:**
```powershell
cd FrontEnd
npm run dev
```

You should see:
```
  VITE v7.1.7  ready in XXXms
  ➜  Local:   http://localhost:5173/
```

## 🎮 Using the Application

1. Open http://localhost:5173/
2. You'll see the login page (not authenticated)
3. Click "Sign up" to create an account
4. Fill in:
   - Username (3+ chars, alphanumeric)
   - Email
   - Password (8+ chars, must have uppercase, lowercase, and number)
5. After registration, you're logged in automatically
6. You'll be redirected to the map
7. Your name appears in the navbar
8. Click "Logout" to sign out

## 🔐 Security Features

- Passwords are hashed with bcrypt (never stored plain)
- JWT tokens expire after 7 days
- Rate limiting: 100 requests per 15 minutes per IP
- CORS protection (only frontend URL allowed)
- Helmet security headers
- Input validation and sanitization
- SQL injection protection (parameterized queries)

## 📡 API Endpoints

### Public Endpoints

**Register:**
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123"
}

Response: { user: {...}, token: "jwt-token" }
```

**Login:**
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}

Response: { user: {...}, token: "jwt-token" }
```

**Google OAuth:**
```
GET /api/auth/google
```
Redirects to Google, then back to frontend with token.

### Protected Endpoints

**Get Profile:**
```
GET /api/auth/profile
Authorization: Bearer <your-jwt-token>

Response: { id, username, email, display_name, avatar_url, created_at }
```

## 🐛 Troubleshooting

**"Cannot connect to database"**
- Check PostgreSQL is running
- Verify DB_PASSWORD in `.env`
- Ensure database `world_quiz` exists

**"Invalid token" errors**
- Token expired (7 days)
- Clear localStorage and login again
- Check JWT_SECRET is the same in `.env`

**Google OAuth not working**
- Verify Google Cloud Console setup
- Check redirect URI matches exactly
- Ensure Google+ API is enabled

**Port already in use**
- Backend: Change PORT in `BackEnd/.env`
- Frontend: Vite will prompt for alternative port

## 🔮 Next Steps

Now that authentication works, you can:

1. **Add game features:**
   - Quiz questions about countries
   - Score tracking
   - Leaderboards
   - Achievements

2. **Extend the database:**
   ```sql
   CREATE TABLE quiz_sessions (
     id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES users(id),
     score INTEGER,
     countries_guessed TEXT[],
     completed_at TIMESTAMP
   );
   ```

3. **Add more API endpoints:**
   - `POST /api/quiz/start` - Start new quiz
   - `POST /api/quiz/answer` - Submit answer
   - `GET /api/leaderboard` - Get top scores
   - `GET /api/user/stats` - User statistics

4. **Enhance frontend:**
   - User profile page
   - Game history
   - Statistics dashboard
   - Social features

## 📚 Technologies Used

**Frontend:**
- React 18.2
- TypeScript 5.4
- Vite 7.1
- React Router 6
- Axios
- react-simple-maps

**Backend:**
- Node.js
- Express 4
- TypeScript 5.3
- PostgreSQL
- JWT (jsonwebtoken)
- Bcrypt
- Passport.js
- Helmet, CORS, Rate Limiting

## 🎉 Success!

You now have a fully functional authentication system! Users can:
- ✅ Register with username/password
- ✅ Login securely
- ✅ Use Google Sign-In
- ✅ Access protected routes
- ✅ Stay logged in (JWT tokens)
- ✅ Log out safely

The map is now protected - only logged-in users can access it!
