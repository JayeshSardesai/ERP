# Backend Restart Required for ID Card Generation

## Issue
The backend server is running but the ID card routes are returning 404 errors. This typically happens when:
1. The server was started before the route files were modified
2. Node.js hasn't picked up the new route configurations

## Solution: Restart Backend Server

### Option 1: Using Task Manager (Windows)
1. Open Task Manager (Ctrl + Shift + Esc)
2. Find the Node.js process (PID: 9040)
3. End the process
4. Restart the backend server

### Option 2: Using Command Line
```powershell
# Kill the existing process
taskkill /F /PID 9040

# Navigate to backend directory
cd d:\ERP\ERP\backend

# Start the server
npm start
```

### Option 3: Using npm (if using nodemon)
```powershell
cd d:\ERP\ERP\backend
npm run dev
```

## Verification Steps

After restarting the backend:

1. **Check Server Logs** - You should see:
   ```
   Server running on port 5050
   Connected to MongoDB
   ```

2. **Test the Endpoint** - Open browser console and run:
   ```javascript
   fetch('http://localhost:5050/api/id-card-templates/generate', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer YOUR_TOKEN',
       'X-School-Code': 'KVS'
     },
     body: JSON.stringify({
       studentIds: ['test'],
       orientation: 'landscape',
       includeBack: true
     })
   }).then(r => r.json()).then(console.log)
   ```

3. **Check for 404 Errors** - The endpoint should now respond (even if with an error about invalid student IDs, that's OK - it means the route is working)

## Expected Behavior After Restart

✅ Backend logs show: `🎯 ID Card Generation Request:`
✅ No 404 errors in browser console
✅ API responds with proper error messages or success

## Files That Were Modified

These files were updated and require a server restart:
- `backend/routes/idCardTemplates.js` - Already had the routes
- `backend/controllers/simpleIDCardController.js` - Added logging
- `frontend/src/components/SimpleIDCardGenerator.tsx` - Added school code header

## Quick Restart Command

```powershell
# Stop and restart in one command
cd d:\ERP\ERP\backend
taskkill /F /PID 9040 & timeout /t 2 & npm start
```

Or if you have the terminal open:
1. Press `Ctrl + C` to stop the server
2. Run `npm start` again
