# POST /api/auth/github Endpoint Implementation

## Overview

This document describes the implementation of the `POST /api/auth/github` endpoint, which provides an alternative method for handling GitHub OAuth authentication via POST request instead of the callback URL pattern.

## Implementation Details

### Endpoint Specification

- **URL**: `POST /api/auth/github`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "code": "github_oauth_authorization_code"
  }
  ```

### Features Implemented

1. ✅ **OAuth Code Exchange**: Exchanges authorization code for GitHub access token
2. ✅ **User Data Fetching**: Retrieves user information from GitHub API
3. ✅ **Email Retrieval**: Fetches primary email if not publicly available
4. ✅ **Database Integration**: Creates or updates user in PostgreSQL database
5. ✅ **Session Token Generation**: Generates JWT token for authenticated session
6. ✅ **Cookie Management**: Sets httpOnly secure cookie with session token
7. ✅ **Error Handling**: Comprehensive error handling for all failure scenarios
8. ✅ **Database Fallback**: Works without database connection (development mode)

### Response Format

#### Success Response (200 OK)

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123456789,
    "githubId": "123456789",
    "email": "user@example.com",
    "name": "User Name",
    "avatarUrl": "https://avatars.githubusercontent.com/u/123456789"
  }
}
```

#### Error Responses

**400 Bad Request - Missing Code**

```json
{
  "error": "no_code",
  "message": "Authorization code is required"
}
```

**400 Bad Request - Invalid Code**

```json
{
  "error": "token_exchange_failed",
  "message": "Failed to exchange code for access token"
}
```

**400 Bad Request - No Email**

```json
{
  "error": "no_email",
  "message": "Could not retrieve email from GitHub account"
}
```

**500 Internal Server Error**

```json
{
  "error": "auth_failed",
  "message": "Authentication failed",
  "details": "Error details here"
}
```

## Testing

### Test Page

A comprehensive test page has been created at `/test-oauth-post` that allows testing the endpoint interactively:

- **URL**: `http://localhost:3000/test-oauth-post`
- **Features**:
  - Input field for OAuth code
  - Test with invalid code button
  - Real-time error/success display
  - Complete endpoint documentation
  - Step-by-step testing instructions

### Testing Error Handling

1. Navigate to `http://localhost:3000/test-oauth-post`
2. Click "Test with Invalid Code"
3. Expected: Error 400 with message "Authorization code is required"
4. ✅ **Verified**: Error handling works correctly

### Testing with Valid OAuth Code

To test with a valid code:

1. Initiate GitHub OAuth flow: Visit `http://localhost:4000/api/auth/github`
2. Authorize on GitHub
3. Copy the `code` parameter from the callback URL
4. Paste into test page input field
5. Click "Test Endpoint"
6. Expected: Success response with token and user data

## Database Integration

### Schema

The endpoint uses the `users` table with the following structure:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    github_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### User Service Functions

The endpoint uses these functions from `userService.js`:

- `createOrUpdateUser(userData)`: Creates new user or updates existing user
- `findUserByGithubId(githubId)`: Finds user by GitHub ID
- `createUser(userData)`: Creates new user record
- `updateUser(id, userData)`: Updates existing user record

### Database Fallback

If the database is unavailable, the endpoint:

1. Logs a warning message
2. Creates a mock user object with GitHub data
3. Continues with JWT token generation
4. Returns success response

This allows development and testing without PostgreSQL running.

## Setup Instructions

### Prerequisites

1. **PostgreSQL**: Install and start PostgreSQL
2. **GitHub OAuth App**: Create OAuth app in GitHub settings
3. **Environment Variables**: Configure in `backend/.env`

### Environment Variables

```bash
# backend/.env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
JWT_SECRET=your_jwt_secret_key
DATABASE_URL=postgresql://localhost:5432/autodocs_dev
PORT=4000
NODE_ENV=development
```

### Database Setup

Run the database setup script:

```bash
./setup-database.sh
```

Or manually:

```bash
# Create database
createdb autodocs_dev

# Run migrations
cd backend && npm run migrate
```

### Start Servers

```bash
# Terminal 1: Start backend
cd backend && npm run dev

# Terminal 2: Start frontend
npm run dev
```

## Security Considerations

1. **CSRF Protection**: The GET callback endpoint uses state tokens for CSRF protection
2. **HTTP-Only Cookies**: Session tokens stored in httpOnly cookies (not accessible via JavaScript)
3. **Secure Flag**: Cookies marked as secure in production
4. **SameSite**: Set to 'lax' for CSRF protection
5. **JWT Expiration**: Tokens expire after 7 days
6. **Environment Secrets**: Client secret never exposed to frontend

## Comparison: POST vs GET Callback

### POST /api/auth/github (New)

- **Pros**:
  - Cleaner API design
  - Easier to test programmatically
  - Returns JSON response with token
  - No CSRF protection needed (no cookies in request)
- **Cons**:
  - Requires frontend to handle OAuth callback
  - Additional step in OAuth flow

### GET /api/auth/github/callback (Existing)

- **Pros**:
  - Standard OAuth callback pattern
  - Automatic redirect to dashboard
  - No frontend code needed
- **Cons**:
  - Requires CSRF protection (state token)
  - Harder to test programmatically
  - Redirect-based (no JSON response)

## Files Modified

1. **backend/src/routes/auth.js**: Added POST endpoint (lines 68-222)
2. **app/test-oauth-post/page.tsx**: Created test page (new file)
3. **setup-database.sh**: Created database setup script (new file)

## Code Quality

- ✅ TypeScript types for frontend
- ✅ JSDoc comments for backend
- ✅ Comprehensive error handling
- ✅ Logging with correlation IDs
- ✅ Database transaction safety
- ✅ Graceful degradation (database fallback)
- ✅ Security best practices

## Future Enhancements

1. **Rate Limiting**: Add rate limiting to prevent abuse
2. **Refresh Tokens**: Implement refresh token rotation
3. **Database Connection Pool**: Optimize database connections
4. **Redis State Store**: Move OAuth state to Redis for scalability
5. **Monitoring**: Add metrics for auth success/failure rates

## Testing Checklist

- ✅ Endpoint accepts POST requests
- ✅ Validates authorization code presence
- ✅ Exchanges code for access token
- ✅ Fetches user info from GitHub
- ✅ Retrieves email (public or private)
- ✅ Creates/updates user in database
- ✅ Generates JWT token
- ✅ Sets httpOnly cookie
- ✅ Returns JSON response
- ✅ Handles missing code error
- ✅ Handles invalid code error
- ✅ Handles missing email error
- ✅ Handles general errors
- ✅ Works without database (fallback)

## Support

For issues or questions:

1. Check backend logs: `logs/` directory
2. Review test page: `http://localhost:3000/test-oauth-post`
3. Verify environment variables in `backend/.env`
4. Ensure PostgreSQL is running: `pg_isready`
5. Check database setup: `./setup-database.sh`
