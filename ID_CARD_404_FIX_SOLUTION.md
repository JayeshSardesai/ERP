# ID Card 404 Error - Complete Solution

## Problem
The ID card generation API is returning **404 Not Found** errors even though:
- ✅ Routes are properly configured in `server.js`
- ✅ Controller functions exist and are exported
- ✅ Backend server is running on port 5050

## Root Cause
**The backend server needs to be restarted** to load the updated route configurations. Node.js doesn't automatically reload route files when they're modified.

## Solution Steps

### Step 1: Stop the Current Backend Server

**Option A: If running in terminal**
1. Go to the terminal where backend is running
2. Press `Ctrl + C` to stop the server

**Option B: Using Task Manager**
1. Open Task Manager (`Ctrl + Shift + Esc`)
2. Find "Node.js" process (PID: 9040)
3. Right-click → End Task

**Option C: Using Command**
```powershell
taskkill /F /PID 9040
```

### Step 2: Start the Backend Server

```powershell
cd d:\ERP\ERP\backend
npm start
```

Or if you have nodemon installed:
```powershell
npm run dev
```

### Step 3: Verify Server Started

You should see output like:
```
Server running on port 5050
Connected to MongoDB
```

### Step 4: Test the Frontend Again

1. Refresh your browser page
2. Navigate to Academic Details → ID Cards tab
3. Select students and click "Generate & Preview"
4. Check browser console for logs

## Expected Console Output After Fix

### Frontend Console (Browser):
```
🎯 Generating ID cards for students: {
  count: 3,
  studentIds: ["id1", "id2", "id3"],
  apiUrl: "http://localhost:5050/api/id-card-templates/generate",
  schoolCode: "KVS",
  hasToken: true
}
✅ ID cards generated successfully
```

### Backend Console (Terminal):
```
🎯 ID Card Generation Request: {
  schoolId: "...",
  studentIds: ["id1", "id2", "id3"],
  studentCount: 3,
  orientation: "landscape",
  includeBack: true
}
📚 Students found in database: {
  requestedCount: 3,
  foundCount: 3,
  students: [...]
}
```

## Manual API Test (Optional)

You can test the endpoint directly using browser console:

```javascript
// Open browser console (F12) and paste this:
const token = JSON.parse(localStorage.getItem('erp.auth')).token;
const schoolCode = localStorage.getItem('erp.schoolCode');

fetch('http://localhost:5050/api/id-card-templates/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-School-Code': schoolCode
  },
  body: JSON.stringify({
    studentIds: ['test-id'],
    orientation: 'landscape',
    includeBack: true
  })
})
.then(r => r.json())
.then(data => {
  console.log('API Response:', data);
  if (data.success === false && data.message === 'No students found') {
    console.log('✅ API is working! (No students found is expected with test ID)');
  }
})
.catch(err => {
  console.error('❌ API Error:', err);
});
```

**Expected Results:**
- ✅ If you get a response (even an error about no students), the API is working
- ❌ If you get 404, the server needs to be restarted

## Troubleshooting

### Issue: Still getting 404 after restart

**Check 1: Verify server is actually restarted**
```powershell
netstat -ano | findstr :5050
```
Should show a LISTENING process. Note the PID.

**Check 2: Check server logs**
Look for any errors when the server starts. Common issues:
- Port already in use
- MongoDB connection failed
- Module not found errors

**Check 3: Verify route file exists**
```powershell
dir backend\routes\idCardTemplates.js
dir backend\controllers\simpleIDCardController.js
```

**Check 4: Check for syntax errors**
```powershell
cd backend
node -c routes/idCardTemplates.js
node -c controllers/simpleIDCardController.js
```

### Issue: Server won't start

**Error: "Port 5050 is already in use"**
```powershell
# Find and kill the process
netstat -ano | findstr :5050
taskkill /F /PID <PID_NUMBER>
```

**Error: "Cannot find module"**
```powershell
cd backend
npm install
```

**Error: "MongoDB connection failed"**
- Check if MongoDB is running
- Verify `.env` file has correct `MONGODB_URI`

### Issue: Authentication errors

**Error: "No token provided"**
- Clear browser cache and login again
- Check localStorage has `erp.auth` key

**Error: "Invalid token"**
- Token might be expired
- Logout and login again

## Files Modified (Reference)

These files were updated to fix the ID card generation:

1. **frontend/src/components/SimpleIDCardGenerator.tsx**
   - Added school code header
   - Fixed student ID extraction (`_id` priority)
   - Enhanced logging

2. **frontend/src/roles/admin/pages/AcademicDetails.tsx**
   - Added `_id` field to student objects
   - Fixed mock data structure

3. **frontend/src/main.tsx**
   - Added React Router v7 future flags

4. **backend/controllers/simpleIDCardController.js**
   - Added debug logging

## Quick Reference Commands

```powershell
# Stop backend
taskkill /F /PID 9040

# Start backend
cd d:\ERP\ERP\backend
npm start

# Check if running
netstat -ano | findstr :5050

# View backend logs
# (Just watch the terminal where npm start is running)
```

## Next Steps After Server Restart

1. ✅ Backend server restarted
2. ✅ Frontend refreshed
3. ✅ Test ID card generation
4. ✅ Check console logs
5. ✅ Verify generated cards

If you still see 404 errors after following all these steps, there may be a deeper configuration issue. In that case:
1. Check `backend/server.js` line 187 has: `app.use('/api/id-card-templates', idCardTemplateRoutes);`
2. Verify `backend/routes/idCardTemplates.js` exports the router correctly
3. Check for any middleware that might be blocking the routes
