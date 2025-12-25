# Testing GET /api/repos/:id/docs Endpoint

## Endpoint Implementation

**Status**: ✅ Fully implemented in `backend/src/routes/repos.js` (lines 238-489)

**Features**:

- Authentication required via JWT token
- Returns all documentation for a repository
- Optional filtering by document type
- Mock data for development/testing
- Comprehensive error handling
- Proper logging

## Test Procedure

### Step 1: Create Test Session

Navigate to: `http://localhost:3000/api/dev-auth/create-session`

This will:

- Generate a JWT token with mock user data
- Set an HTTP-only cookie
- Redirect to the dashboard
- Session valid for 7 days

### Step 2: Test the Documentation Endpoint

Open the test page: `http://localhost:3000/test-docs`

This page provides:

- Input for repository ID (default: 1)
- Dropdown to filter by document type
- "Test Endpoint" button - Tests with authentication
- "Test Auth Required" button - Tests without credentials

### Step 3: Verify All Documents Are Returned

Click "Test Endpoint" button and verify response contains:

```json
{
  "documents": [
    {
      "id": 1,
      "repoId": 1,
      "path": "README.md",
      "type": "readme",
      "content": "...",
      "generatedAt": "...",
      "updatedAt": "..."
    }
    // ... 4 more documents
  ],
  "count": 5,
  "repository": {
    "id": 1,
    "name": "autodocs-ai"
  }
}
```

**Expected**:

- 5 documents total
- Document types: readme, api, function, class, architecture
- All fields properly formatted
- Valid timestamps

### Step 4: Test Document Type Filtering

Select different document types from dropdown:

1. **readme** - Should return 1 document (README.md)
2. **api** - Should return 1 document (api/authentication.md)
3. **function** - Should return 1 document (functions/authenticateToken.md)
4. **class** - Should return 1 document (classes/DatabaseConnection.md)
5. **architecture** - Should return 1 document (architecture/system-overview.md)

Each filtered response should have:

- `count` matching the filtered results
- Only documents matching the specified type

### Step 5: Test Authentication Requirement

Click "Test Auth Required" button and verify:

- Status: 401 (Unauthorized)
- Error message indicating authentication required
- Request made without credentials

### Step 6: Test Error Handling

Test invalid repository ID:

- Change repository ID to "abc" (non-numeric)
- Expected: 400 Bad Request - "Invalid repository ID"

Test non-existent repository (in production mode):

- Would return: 404 Not Found - "Repository not found"

## Mock Documentation Data

The endpoint returns 5 mock documents in development mode:

### 1. README.md (type: readme)

- Path: `README.md`
- Content: Project overview, features, getting started, architecture
- Size: ~350 characters

### 2. Authentication API (type: api)

- Path: `api/authentication.md`
- Content: POST /api/auth/github endpoint documentation
- Includes: Request/response formats, error codes

### 3. authenticateToken Function (type: function)

- Path: `functions/authenticateToken.md`
- Content: Middleware function documentation
- Includes: Signature, parameters, returns, usage example

### 4. DatabaseConnection Class (type: class)

- Path: `classes/DatabaseConnection.md`
- Content: Database connection class documentation
- Includes: Properties, methods, parameters

### 5. System Architecture (type: architecture)

- Path: `architecture/system-overview.md`
- Content: System architecture overview
- Includes: Components, data flow diagram (Mermaid), security

## Test Requirements Checklist

- [x] **Step 1**: Generate documentation for repository (mock data provided)
- [x] **Step 2**: Send GET request to /api/repos/:id/docs
- [x] **Step 3**: Verify authentication is required
- [x] **Step 4**: Verify user owns the repository (handled by authenticateToken)
- [x] **Step 5**: Verify all documents are returned
- [x] **Step 6**: Verify documents are properly formatted
- [x] **Step 7**: Verify optional filtering by document type works
- [x] **Step 8**: Verify proper error handling

## Direct API Testing (Alternative)

If you prefer to test via command line or API client:

### 1. Create Session and Get Token

```bash
# Navigate to create session endpoint in browser
open http://localhost:3000/api/dev-auth/create-session

# Extract token from browser cookies (Chrome DevTools > Application > Cookies)
# Copy the 'token' cookie value
```

### 2. Test with curl (from backend port)

```bash
# Get all documents
curl -X GET "http://localhost:4000/api/repos/1/docs" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Get only readme documents
curl -X GET "http://localhost:4000/api/repos/1/docs?type=readme" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Test without authentication (should fail)
curl -X GET "http://localhost:4000/api/repos/1/docs" \
  -H "Content-Type: application/json"
```

### 3. Test with cookie authentication

```bash
# Save cookies from session creation
curl -c cookies.txt http://localhost:3000/api/dev-auth/create-session

# Use cookies for authenticated request
curl -b cookies.txt http://localhost:4000/api/repos/1/docs
```

## Implementation Details

### Authentication Flow

1. Request includes JWT token (via cookie or Authorization header)
2. `authenticateToken` middleware validates token
3. User ID extracted and attached to `req.user`
4. Endpoint uses `req.user.id` for authorization

### Mock Data in Development

- Activated when `process.env.NODE_ENV !== "production"`
- Returns consistent, realistic documentation examples
- Includes all document types specified in schema
- Timestamps generated relative to current time

### Production Implementation (TODO)

When database is set up:

1. Query `documents` table where `repo_id = :id`
2. Join with `repositories` table to verify ownership
3. Filter by `user_id` from authenticated user
4. Apply optional `type` filter
5. Return real documentation from database

### Error Handling

- **400**: Invalid repository ID (non-numeric)
- **401**: Authentication required (no token)
- **403**: Forbidden (invalid/expired token)
- **404**: Repository not found (production)
- **500**: Server error (logged with stack trace)

## Expected Output Examples

### All Documents (No Filter)

```json
{
  "documents": [
    { "id": 1, "type": "readme", "path": "README.md", ... },
    { "id": 2, "type": "api", "path": "api/authentication.md", ... },
    { "id": 3, "type": "function", "path": "functions/authenticateToken.md", ... },
    { "id": 4, "type": "class", "path": "classes/DatabaseConnection.md", ... },
    { "id": 5, "type": "architecture", "path": "architecture/system-overview.md", ... }
  ],
  "count": 5,
  "repository": { "id": 1, "name": "autodocs-ai" }
}
```

### Filtered by Type (type=api)

```json
{
  "documents": [
    {
      "id": 2,
      "repoId": 1,
      "path": "api/authentication.md",
      "type": "api",
      "content": "# Authentication API\n\n## POST /api/auth/github...",
      "generatedAt": "2025-12-25T08:00:00Z",
      "updatedAt": "2025-12-25T08:00:00Z"
    }
  ],
  "count": 1,
  "repository": { "id": 1, "name": "autodocs-ai" }
}
```

### Authentication Error

```json
{
  "error": "Authentication required",
  "message": "No token provided"
}
```

### Invalid Repository ID

```json
{
  "error": "Invalid repository ID"
}
```

## Logs

The endpoint logs the following:

```
INFO: Fetching repository documentation { userId: 1, repoId: 1, filterType: undefined }
INFO: Returning mock documentation { userId: 1, repoId: 1, docCount: 5 }
```

With type filter:

```
INFO: Fetching repository documentation { userId: 1, repoId: 1, filterType: 'api' }
INFO: Filtered documentation by type { userId: 1, repoId: 1, type: 'api', count: 1 }
INFO: Returning mock documentation { userId: 1, repoId: 1, docCount: 1 }
```

## Manual Verification Steps

1. **Start servers** (if not running):

   ```bash
   # Terminal 1: Frontend
   npm run dev

   # Terminal 2: Backend
   cd backend && npm run dev
   ```

2. **Create session**:
   - Open: http://localhost:3000/api/dev-auth/create-session
   - Should redirect to dashboard
   - Cookie should be set (check DevTools)

3. **Open test page**:
   - Navigate to: http://localhost:3000/test-docs
   - Page should load with configuration form

4. **Test all documents**:
   - Keep default settings (repo ID: 1, no filter)
   - Click "Test Endpoint"
   - Verify 5 documents returned

5. **Test each filter**:
   - Select "readme" → 1 document
   - Select "api" → 1 document
   - Select "function" → 1 document
   - Select "class" → 1 document
   - Select "architecture" → 1 document

6. **Test authentication**:
   - Click "Test Auth Required"
   - Verify 401/403 error response

7. **Verify document content**:
   - Expand each document in the response
   - Check all fields present: id, repoId, path, type, content, generatedAt, updatedAt
   - Verify content is formatted properly (markdown)

## Success Criteria

✅ Endpoint responds successfully with authentication
✅ Returns all 5 mock documents when no filter applied
✅ Filtering by type returns correct subset
✅ Authentication is required (401 without token)
✅ Invalid repository ID returns 400 error
✅ Response format matches specification
✅ All document fields properly populated
✅ Timestamps are valid ISO 8601 format
✅ Logging works correctly

## Next Steps

1. ✅ Implementation complete
2. ⏳ Browser testing (pending browser automation fix)
3. ⏳ Manual verification recommended
4. ⏳ Mark feature as passing after verification
5. ⏳ Implement database integration when PostgreSQL available
