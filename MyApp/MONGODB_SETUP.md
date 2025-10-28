# MongoDB Atlas Integration Guide

This guide will help you connect your React Native app to MongoDB Atlas.

## 📋 Prerequisites

- MongoDB Atlas account (free tier available)
- Node.js backend server (recommended) OR MongoDB Atlas Data API

## 🚀 Setup Steps

### Option 1: Using Backend Server (Recommended)

#### Step 1: Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Sign up or log in
3. Create a new project (e.g., "EduLogix")
4. Click "Build a Database"
5. Choose "FREE" tier (M0 Sandbox)
6. Select your cloud provider and region
7. Click "Create Cluster"

#### Step 2: Configure Database Access

1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Create a username and password (save these!)
4. Set user privileges to "Read and write to any database"
5. Click "Add User"

#### Step 3: Configure Network Access

1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. For testing: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production: Add your server's IP address
5. Click "Confirm"

#### Step 4: Get Connection String

1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string
5. It looks like: `mongodb+srv://<username>:<password>@cluster.mongodb.net/<database>`

#### Step 5: Update Configuration

Open `src/config/env.ts` and update:

```typescript
export const ENV = {
  API_BASE_URL: 'https://your-backend-api.com/api',
  MONGODB_URI: 'mongodb+srv://your-username:your-password@cluster.mongodb.net/edulogix?retryWrites=true&w=majority',
  // ... rest of config
};
```

### Option 2: Using MongoDB Atlas Data API (Not Recommended for Production)

#### Step 1: Enable Data API

1. In MongoDB Atlas, go to your cluster
2. Click "Data API" in the left sidebar
3. Click "Enable the Data API"
4. Create an API key
5. Copy the API key and endpoint URL

#### Step 2: Update Configuration

```typescript
// In src/services/api.ts
export const mongoDBService = {
  findDocuments: async (collection: string, filter: any) => {
    const response = await axios.post(
      'https://data.mongodb-api.com/app/YOUR-APP-ID/endpoint/data/v1/action/find',
      {
        collection,
        database: 'edulogix',
        dataSource: 'Cluster0',
        filter,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': 'YOUR-API-KEY',
        },
      }
    );
    return response.data.documents;
  },
};
```

## 📊 Database Schema

### Collections Structure

#### 1. `students` Collection
```json
{
  "_id": "ObjectId",
  "username": "student123",
  "password": "hashed_password",
  "schoolCode": "SCH001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@school.com",
  "phone": "1234567890",
  "class": "10",
  "section": "A",
  "rollNumber": "25",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

#### 2. `attendance` Collection
```json
{
  "_id": "ObjectId",
  "studentId": "ObjectId",
  "date": "2025-10-17",
  "status": "present", // "present", "absent", "no-class"
  "session": "morning", // "morning", "afternoon", "full-day"
  "remarks": "",
  "createdAt": "2025-10-17T10:00:00Z"
}
```

#### 3. `results` Collection
```json
{
  "_id": "ObjectId",
  "studentId": "ObjectId",
  "subject": "Mathematics",
  "testName": "Formative Assessment 1",
  "testType": "formative", // "formative", "midterm", "final"
  "totalMarks": 20,
  "obtainedMarks": 17,
  "percentage": 85,
  "grade": "A",
  "date": "2025-03-08",
  "createdAt": "2025-03-08T00:00:00Z"
}
```

#### 4. `assignments` Collection
```json
{
  "_id": "ObjectId",
  "studentId": "ObjectId",
  "subject": "English",
  "title": "Essay: The Great Gatsby",
  "description": "Write a 500-word essay",
  "dueDate": "2025-10-18T23:59:00Z",
  "status": "todo", // "todo", "complete", "graded"
  "submittedAt": null,
  "grade": null,
  "remarks": "",
  "createdAt": "2025-10-15T00:00:00Z"
}
```

#### 5. `activity` Collection
```json
{
  "_id": "ObjectId",
  "studentId": "ObjectId",
  "type": "assignment", // "assignment", "grade", "announcement", "reminder"
  "title": "New Assignment: History 101",
  "description": "Due: 2025-10-15",
  "icon": "📄",
  "iconBg": "#DBEAFE",
  "createdAt": "2025-10-17T08:00:00Z"
}
```

#### 6. `announcements` Collection
```json
{
  "_id": "ObjectId",
  "schoolCode": "SCH001",
  "title": "School Reopening - Oct 24",
  "description": "School reopens on oct 24 after diwali vacations",
  "icon": "📢",
  "priority": "high", // "low", "medium", "high"
  "createdAt": "2025-10-10T00:00:00Z",
  "expiresAt": "2025-10-24T00:00:00Z"
}
```

## 🔧 Backend API Setup (Node.js + Express)

Create a simple backend server to handle MongoDB operations:

### 1. Install Dependencies
```bash
npm install express mongoose cors dotenv bcrypt jsonwebtoken
```

### 2. Create Server (server.js)
```javascript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Routes
app.post('/api/auth/login', async (req, res) => {
  const { username, password, schoolCode, role } = req.body;
  // Implement login logic
  // Verify credentials, generate JWT token
  res.json({ token: 'jwt-token', user: { username, role } });
});

app.get('/api/student/:id', async (req, res) => {
  // Fetch student data
  res.json({ student: {} });
});

app.get('/api/attendance', async (req, res) => {
  // Fetch attendance data
  res.json({ attendance: [] });
});

app.get('/api/results/:studentId', async (req, res) => {
  // Fetch results
  res.json({ results: [] });
});

app.get('/api/assignments', async (req, res) => {
  // Fetch assignments
  res.json({ assignments: [] });
});

app.get('/api/activity', async (req, res) => {
  // Fetch activity
  res.json({ activity: [] });
});

app.get('/api/announcements', async (req, res) => {
  // Fetch announcements
  res.json({ announcements: [] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 3. Create .env File
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/edulogix
JWT_SECRET=your-secret-key
PORT=3000
```

### 4. Deploy Backend
Deploy your backend to:
- Heroku
- Vercel
- AWS
- DigitalOcean
- Or any other hosting service

## 📱 Using the API in React Native

### Update env.ts with your backend URL:
```typescript
export const ENV = {
  API_BASE_URL: 'https://your-backend.herokuapp.com/api',
  // ... rest
};
```

### Example Usage in Screens:

```typescript
import { studentService } from '../services/api';

// In your component
useEffect(() => {
  const fetchData = async () => {
    const result = await studentService.getAttendance('student-id', '10', '2025');
    if (result.success) {
      setAttendanceData(result.data);
    }
  };
  fetchData();
}, []);
```

## 🔒 Security Best Practices

1. **Never expose MongoDB connection string in the app**
   - Always use a backend server
   - Store sensitive data in environment variables

2. **Use JWT for authentication**
   - Store tokens securely in AsyncStorage
   - Implement token refresh mechanism

3. **Validate all inputs**
   - Sanitize user inputs on backend
   - Use schema validation (Joi, Yup)

4. **Use HTTPS**
   - Always use HTTPS for API calls
   - Never send sensitive data over HTTP

5. **Implement rate limiting**
   - Prevent brute force attacks
   - Use express-rate-limit

## 🧪 Testing the Connection

### Test with Postman:
1. Create a POST request to `http://localhost:3000/api/auth/login`
2. Body:
```json
{
  "username": "student123",
  "password": "password",
  "schoolCode": "SCH001",
  "role": "Student"
}
```
3. Check if you get a response with token

### Test in React Native:
1. Update `src/config/env.ts` with your backend URL
2. Run the app: `npm run android`
3. Try logging in with test credentials
4. Check console for API responses

## 📝 Sample Data for Testing

Insert this data into MongoDB for testing:

```javascript
// Students
db.students.insertOne({
  username: "student123",
  password: "$2b$10$...", // bcrypt hashed password
  schoolCode: "SCH001",
  firstName: "John",
  lastName: "Doe",
  email: "john@school.com",
  class: "10",
  section: "A"
});

// Attendance
db.attendance.insertMany([
  {
    studentId: ObjectId("..."),
    date: "2025-10-17",
    status: "present",
    session: "full-day"
  }
]);

// Results
db.results.insertMany([
  {
    studentId: ObjectId("..."),
    subject: "Mathematics",
    testName: "Formative Assessment 1",
    totalMarks: 20,
    obtainedMarks: 17,
    percentage: 85
  }
]);
```

## 🎯 Next Steps

1. Set up MongoDB Atlas cluster
2. Create backend server
3. Deploy backend
4. Update `src/config/env.ts` with your API URL
5. Test the connection
6. Implement data fetching in screens
7. Add loading states and error handling

## 📞 Troubleshooting

### Connection Issues:
- Check if IP is whitelisted in MongoDB Atlas
- Verify connection string is correct
- Check if backend server is running

### Authentication Issues:
- Verify JWT token is being sent in headers
- Check token expiration
- Verify user credentials

### Data Not Loading:
- Check API endpoint URLs
- Verify request parameters
- Check backend logs for errors

---

**Your MongoDB Atlas URL should be added to `src/config/env.ts`**

Replace `API_BASE_URL` with your actual backend URL!
