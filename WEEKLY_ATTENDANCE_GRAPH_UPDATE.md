# Weekly Attendance Graph Update

## Summary
Updated the Weekly Attendance bar chart on the admin dashboard to pull real data from the backend, calculating attendance rates from the `students` array in the `attendances` collection, matching the same approach used for the overall attendance rate.

## Changes Made

### Backend (`attendanceController.js`)

#### Updated `getDailyAttendanceStats` Function
- Modified to iterate through the `students` array in each attendance session
- Counts students by their `status` field: `present`, `absent`, `half-day`
- Groups data by date for the last 7 days
- Calculates daily attendance rate: `(present / total) × 100`
- Includes fallback to `successCount`/`failCount` for backward compatibility

### Frontend (`Dashboard.tsx`)
✅ **Already configured** - No changes needed!
- Fetches data from `GET /api/attendance/daily-stats`
- Maps response to chart format with day names and attendance rates
- Displays last 7 days of attendance data

## Data Flow

```
School Database (attendances collection)
  ↓
Filter: Last 7 days
  ↓
For each session document:
  - Iterate through students array
  - Count by status (present/absent/half-day)
  ↓
Group by date:
  - Aggregate all sessions for each day
  - Calculate daily attendance rate
  ↓
Return array of 7 days with rates
  ↓
Frontend displays as bar chart
```

## API Endpoint

**URL**: `GET /api/attendance/daily-stats`

**Query Parameters**:
- `schoolCode` (optional): School code for filtering

**Response**:
```json
{
  "success": true,
  "dailyStats": [
    {
      "date": "2025-10-22",
      "totalPresent": 450,
      "totalAbsent": 25,
      "totalHalfDay": 5,
      "totalRecords": 480,
      "attendanceRate": 93.8
    },
    {
      "date": "2025-10-23",
      "totalPresent": 465,
      "totalAbsent": 15,
      "totalHalfDay": 0,
      "totalRecords": 480,
      "attendanceRate": 96.9
    },
    // ... 5 more days
  ],
  "period": {
    "from": "2025-10-22",
    "to": "2025-10-28"
  }
}
```

## Calculation Logic

### Step-by-Step Process

1. **Get date range**: Last 7 days (today - 6 days to today)
2. **Fetch sessions**: All attendance documents within date range
3. **Group by date**: Create map with date as key
4. **For each session**:
   - If `students` array exists:
     - Iterate through students
     - Count by status (present/absent/half-day)
   - Else: Use `successCount`/`failCount` (fallback)
5. **Calculate daily rate**: `(totalPresent / totalRecords) × 100`
6. **Sort by date**: Ascending order
7. **Return array**: 7 days of statistics

### Code Example

```javascript
// Backend calculation
sessions.forEach(session => {
  const dateStr = session.dateString;
  
  if (!dailyMap[dateStr]) {
    dailyMap[dateStr] = {
      date: dateStr,
      totalPresent: 0,
      totalAbsent: 0,
      totalHalfDay: 0
    };
  }

  // Count from students array
  if (session.students && Array.isArray(session.students)) {
    session.students.forEach(student => {
      const status = student.status?.toLowerCase();
      if (status === 'present') {
        dailyMap[dateStr].totalPresent++;
      } else if (status === 'absent') {
        dailyMap[dateStr].totalAbsent++;
      } else if (status === 'half-day') {
        dailyMap[dateStr].totalHalfDay++;
      }
    });
  }
});

// Calculate rate for each day
const dailyStats = Object.values(dailyMap).map(day => {
  const total = day.totalPresent + day.totalAbsent + day.totalHalfDay;
  const attendanceRate = (day.totalPresent / total) * 100;
  return { ...day, attendanceRate };
});
```

## Chart Display

### Weekly Attendance Bar Chart
- **X-Axis**: Day names (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
- **Y-Axis**: Attendance rate (0-100%)
- **Bars**: Blue bars showing daily attendance percentage
- **Data**: Real data from last 7 days

### Example Chart Data
```javascript
[
  { name: 'Tue', attendance: 93.8, date: '2025-10-22' },
  { name: 'Wed', attendance: 96.9, date: '2025-10-23' },
  { name: 'Thu', attendance: 95.2, date: '2025-10-24' },
  { name: 'Fri', attendance: 94.5, date: '2025-10-25' },
  { name: 'Sat', attendance: 92.1, date: '2025-10-26' },
  { name: 'Sun', attendance: 0.0, date: '2025-10-27' },    // No school
  { name: 'Mon', attendance: 97.3, date: '2025-10-28' }
]
```

## Features

✅ **Real-time data**: Fetches actual attendance from database
✅ **7-day view**: Shows last week's attendance trends
✅ **Student-level accuracy**: Uses individual student status, not just counts
✅ **Half-day support**: Properly handles half-day attendance
✅ **Fallback handling**: Shows 0% for days with no data
✅ **Auto-refresh**: Updates when dashboard loads
✅ **Consistent calculation**: Same logic as overall attendance rate

## Benefits

1. **Accurate Trends**: See actual attendance patterns over the week
2. **Identify Issues**: Quickly spot days with low attendance
3. **Data-Driven**: Make decisions based on real data
4. **Consistent**: Same calculation method across all metrics
5. **Visual**: Easy-to-understand bar chart format

## Example Scenarios

### Scenario 1: Normal Week
```
Mon: 96.5%  ████████████████████
Tue: 95.2%  ███████████████████
Wed: 97.1%  ████████████████████
Thu: 94.8%  ███████████████████
Fri: 93.5%  ██████████████████
Sat: 0.0%   (No school)
Sun: 0.0%   (No school)
```

### Scenario 2: Holiday Week
```
Mon: 0.0%   (Holiday)
Tue: 0.0%   (Holiday)
Wed: 0.0%   (Holiday)
Thu: 96.5%  ████████████████████
Fri: 95.8%  ███████████████████
Sat: 0.0%   (No school)
Sun: 0.0%   (No school)
```

### Scenario 3: Low Attendance Day
```
Mon: 96.5%  ████████████████████
Tue: 95.2%  ███████████████████
Wed: 78.3%  ███████████████     ⚠️ Low!
Thu: 96.1%  ████████████████████
Fri: 94.8%  ███████████████████
Sat: 0.0%   (No school)
Sun: 0.0%   (No school)
```

## Integration with Other Metrics

The Weekly Attendance graph now uses the same data source and calculation method as:

1. **Attendance Rate Card**: Overall attendance percentage
2. **Today's Attendance Pie Chart**: Present/Absent breakdown
3. **All attendance reports**: Consistent across the system

## Testing

Once MongoDB is connected:

1. **Mark attendance** for multiple days
2. **Refresh dashboard**
3. **Weekly Attendance chart** should show bars with actual percentages
4. **Hover over bars** to see exact attendance rate
5. **Console logs** will show detailed data

### Expected Console Output
```
📅 Fetching attendance for last 7 days
[DAILY STATS] Found 14 sessions
[DAILY STATS] Calculated stats for 7 days
📅 Daily attendance data: {
  success: true,
  dailyStats: [
    { date: '2025-10-22', attendanceRate: 93.8, ... },
    { date: '2025-10-23', attendanceRate: 96.9, ... },
    ...
  ]
}
```

## Future Enhancements

1. **Date Range Selector**: Allow viewing different time periods
2. **Comparison View**: Compare current week vs previous week
3. **Class Filter**: Show attendance for specific classes
4. **Export**: Download weekly attendance report
5. **Alerts**: Highlight days with attendance below threshold
6. **Tooltips**: Show detailed breakdown on hover (present/absent counts)
