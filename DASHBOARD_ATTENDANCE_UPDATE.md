# Dashboard Attendance Chart Update

## Summary
Updated the dashboard to fetch today's attendance data from the school's database using the `successCount` and `failCount` fields from the `attendances` collection.

## Changes Made

### Backend (`attendanceController.js`)
✅ **Updated `getAttendanceStats` endpoint** to:
- Support single `date` query parameter for fetching specific day's attendance
- Query the school-specific database's `attendances` collection
- Aggregate `successCount` (present students) and `failCount` (absent students) from all sessions
- Return `presentCount` and `absentCount` in the response

### Frontend (`Dashboard.tsx`)
✅ **Already configured** to:
- Fetch today's attendance using `GET /api/attendance/stats?date={today}`
- Extract `presentCount` and `absentCount` from the API response
- Update the pie chart dynamically with real data
- Display centered, larger chart with labels and percentages

## Data Flow

```
School Database (attendances collection)
  ↓
  Documents with successCount & failCount fields
  ↓
Backend API: GET /api/attendance/stats?date=2025-10-28
  ↓
  Aggregates all sessions for the date
  ↓
Response: { presentCount: X, absentCount: Y }
  ↓
Frontend Dashboard
  ↓
Updates Pie Chart with real-time data
```

## API Endpoint

**URL**: `GET /api/attendance/stats`

**Query Parameters**:
- `date` (optional): Specific date in YYYY-MM-DD format (e.g., "2025-10-28")
- `class` (optional): Filter by class
- `section` (optional): Filter by section
- `startDate` & `endDate` (optional): Date range

**Response**:
```json
{
  "success": true,
  "totalSessions": 2,
  "totalPresent": 45,
  "totalAbsent": 5,
  "presentCount": 45,
  "absentCount": 5,
  "totalRecords": 50,
  "averageAttendance": 90.0,
  "attendanceRate": "90.0%"
}
```

## Database Schema

The backend queries the `attendances` collection in the school-specific database:

```javascript
{
  date: Date,
  class: String,
  section: String,
  session: "morning" | "afternoon",
  successCount: Number,  // Students marked present
  failCount: Number,     // Students marked absent
  // ... other fields
}
```

## How It Works

1. **Frontend requests** today's attendance on dashboard load
2. **Backend queries** the school's `attendances` collection for today's date
3. **Backend aggregates** all `successCount` and `failCount` values from matching documents
4. **Backend returns** total present and absent counts
5. **Frontend updates** the pie chart with real data
6. **Chart displays** present/absent breakdown with percentages

## Testing

Once the MongoDB connection is fixed:

1. Mark attendance for some students
2. Refresh the dashboard
3. The pie chart should show actual present/absent counts
4. The chart updates automatically when new attendance is marked

## Benefits

✅ Real-time data from actual attendance records
✅ Aggregates both morning and afternoon sessions
✅ Supports filtering by class/section
✅ Centered, larger, more prominent display
✅ Shows percentages and total counts
✅ Dynamic updates without page reload
