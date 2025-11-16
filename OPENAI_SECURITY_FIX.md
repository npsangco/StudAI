# OpenAI API Security Fix - Production Deployment

## Problem
The OpenAI API was being called directly from the frontend code, exposing the API key in the client-side JavaScript bundle. This caused:
- 401 authentication errors in production
- Security vulnerability (API key exposed to users)
- Inability to rotate keys without rebuilding the frontend

## Solution Implemented
Moved all OpenAI API calls to the backend server, keeping the API key secure on the server side.

## Changes Made

### 1. Backend Changes (`server/server.js`)
Added two new secure API endpoints:

#### `/api/openai/summarize` (POST)
- Handles AI summarization requests
- Accepts: `{ text: string, systemPrompt?: string }`
- Returns: `{ summary: string }`

#### `/api/openai/chat` (POST)
- Handles chatbot conversation requests
- Accepts: `{ messages: Array<{role: string, content: string}> }`
- Returns: `{ reply: string }`

### 2. Frontend Changes

#### `src/pages/Dashboard.jsx`
- Updated `generateAISummary()` to call backend endpoint
- Changed from direct OpenAI API call to: `axios.post('${API_URL}/api/openai/summarize')`

#### `src/components/Chatbot.jsx`
- Updated `callOpenAIAPI()` to call backend endpoint
- Changed from direct OpenAI API call to: `axios.post('${API_URL}/api/openai/chat')`
- Added necessary imports (axios, API_URL)

### 3. Environment Configuration

#### `server/.env.example`
- Added `OPENAI_API_KEY=your_openai_api_key`

#### Frontend `.env`
- **REMOVED** `VITE_OPENAI_API_KEY` (no longer needed or safe)

## Deployment Steps

### For Digital Ocean App Platform:

1. **Add Environment Variable to Backend**
   - Go to your Digital Ocean App Platform dashboard
   - Navigate to your app → Settings → App-Level Environment Variables
   - Add: `OPENAI_API_KEY=your-actual-api-key`
   - Or add it to the backend component's environment variables

2. **Get a Valid OpenAI API Key**
   - Visit: https://platform.openai.com/api-keys
   - Create a new secret key
   - Copy the key immediately (it won't be shown again)

3. **Update Server `.env` File**
   ```bash
   cd server
   # Edit .env file and add:
   OPENAI_API_KEY=sk-proj-YOUR-ACTUAL-KEY-HERE
   ```

4. **Deploy Changes**
   ```bash
   git add .
   git commit -m "Fix: Move OpenAI API calls to backend for security"
   git push origin main
   ```

5. **Verify Environment Variable in Production**
   - Check Digital Ocean logs to ensure `OPENAI_API_KEY` is loaded
   - Test the AI features in your deployed app

## Testing Locally

1. Update `server/.env` with your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-proj-your-key-here
   ```

2. Restart both servers:
   ```bash
   # Terminal 1 - Backend
   cd server
   npm start

   # Terminal 2 - Frontend  
   npm run dev
   ```

3. Test AI features:
   - Upload a document and try AI summarization in Dashboard
   - Open Chatbot and ask questions about a note

## Security Benefits

✅ API key no longer exposed in frontend bundle
✅ Key can be rotated without rebuilding frontend
✅ Backend can implement rate limiting per user
✅ Better error handling and logging
✅ Centralized API key management

## Additional Recommendations

1. **Add Rate Limiting** (future enhancement):
   ```javascript
   // In server.js, limit AI requests per user
   const aiRateLimit = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 20, // limit each user to 20 requests per windowMs
     message: 'Too many AI requests, please try again later.'
   });
   
   app.post("/api/openai/*", aiRateLimit, ...);
   ```

2. **Monitor Usage**: Set up OpenAI usage alerts in your OpenAI dashboard

3. **Error Handling**: The backend now returns specific error messages for debugging

## Troubleshooting

### Still getting 401 errors?
- Verify the `OPENAI_API_KEY` is set in your production environment
- Check the key is valid at https://platform.openai.com/api-keys
- Ensure you have billing set up on your OpenAI account

### Backend says "OpenAI API key not configured"?
- The environment variable isn't loaded
- Check the `.env` file is in the `server/` directory
- Restart the backend server after adding the key

### Frontend says "Failed to generate summary"?
- Check backend logs for the actual error
- Verify the backend is running and accessible
- Check CORS settings allow your frontend domain
