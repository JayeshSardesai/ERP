# Session-Based Attendance Charts

## Summary
Updated the Today's Attendance section on the admin dashboard to display **two separate pie charts** - one for the morning session and one for the afternoon session, each pulling real data from the school's database.

## Changes Made

### Backend (`attendanceController.js`)

#### New `getSessionAttendanceData` Function
- Fetches attendance data for a specific session (morning or afternoon)
- Filters by date and session type
- Counts students from the `students` array by their `status` field
- Returns session-specific present/absent/half-day counts

### Backend Routes (`attendance.js`)
Added new route:
```javascript
GET /api/attendance/session-data?date={date}&session={morning|afternoon}
```

### Frontend (`Dashboard.tsx`)

#### Added State Variables
- `morningAttendance`: Stores morning session data
- `afternoonAttendance`: Stores afternoon session data

#### Updated Data Fetching
- Fetches morning session data separately
- Fetches afternoon session data separately
- Each session has its own API call

#### Updated UI
- Replaced single centered chart with **two side-by-side charts**
- Morning session (left) with sun icon
- Afternoon session (right) with moon icon
- Each chart shows its own present/absent breakdown

## API Endpoint

**URL**: `GET /api/attendance/session-data`

**Query Parameters**:
- `date` (required): Date in YYYY-MM-DD format (e.g., "2025-10-28")
- `session` (required): "morning" or "afternoon"

**Response**:
```json
{
  "success": true,
  "session": "morning",
  "date": "2025-10-28",
  "presentCount": 235,
  "absentCount": 15,
  "halfDayCount": 5,
  "totalRecords": 255,
  "attendanceRate": 92.2,
  "attendanceRateFormatted": "92.2%"
}
```

## Data Flow

```
School Database (attendances collection)
  ↓
Filter by: date AND session
  ↓
For each matching document:
  - Iterate through students array
  - Count by status (present/absent/half-day)
  ↓
Return session-specific counts
  ↓
Frontend displays in separate pie charts
```

## Chart Display

### Morning Session Chart (Left)
- **Icon**: Yellow sun icon
- **Title**: "Morning Session"
- **Data**: Present/Absent counts from morning sessions
- **Colors**: Green (present), Red (absent)
- **Size**: 250px height
- **Labels**: Shows count and percentage on chart

### Afternoon Session Chart (Right)
- **Icon**: Orange moon icon
- **Title**: "Afternoon Session"
- **Data**: Present/Absent counts from afternoon sessions
- **Colors**: Green (present), Red (absent)
- **Size**: 250px height
- **Labels**: Shows count and percentage on chart

## Layout

```
┌─────────────────────────────────────────────────────────┐
│                     Dashboard                            │
├──────────────────────┬──────────────────────────────────┤
│  Morning Session     │    Afternoon Session             │
│  ☀️                  │    🌙                            │
│                      │                                  │
│   [Pie Chart]        │    [Pie Chart]                   │
│                      │                                  │
│  Present: 235        │    Present: 220                  │
│  Absent: 15          │    Absent: 20                    │
│  Total: 250 students │    Total: 240 students           │
└──────────────────────┴──────────────────────────────────┘
```

## Example Data

### Morning Session
```javascript
{
  present: 235,
  absent: 15,
  total: 250
}
// Chart shows: 94% attendance
```

### Afternoon Session
```javascript
{
  present: 220,
  absent: 20,
  total: 240
}
// Chart shows: 91.7% attendance
```

## Features

✅ **Separate Sessions**: Clear distinction between morning and afternoon
✅ **Real-Time Data**: Fetches actual attendance from database
✅ **Visual Icons**: Sun for morning, moon for afternoon
✅ **Detailed Breakdown**: Shows exact counts and percentages
✅ **Responsive**: Side-by-side on desktop, stacked on mobile
✅ **Consistent Calculation**: Uses same logic as other attendance metrics
✅ **Empty State Handling**: Shows 0 when no data available

## Benefits

1. **Session Visibility**: See attendance patterns by time of day
2. **Identify Trends**: Spot if afternoon attendance is lower
3. **Detailed Insights**: More granular than combined data
4. **Better Monitoring**: Track each session independently
5. **Visual Clarity**: Easy to compare morning vs afternoon

## Use Cases

### Use Case 1: Normal Day
```
Morning:  235 present, 15 absent (94.0%)
Afternoon: 220 present, 20 absent (91.7%)
```
**Insight**: Slight drop in afternoon attendance

### Use Case 2: Half-Day Schedule
```
Morning:  250 present, 10 absent (96.2%)
Afternoon: 0 present, 0 absent (No session)
```
**Insight**: Only morning session held

### Use Case 3: Low Afternoon Attendance
```
Morning:  240 present, 10 absent (96.0%)
Afternoon: 180 present, 60 absent (75.0%)
```
**Insight**: Significant afternoon absenteeism - needs investigation

## Database Query

### Morning Session Query
```javascript
{
  date: {
    $gte: new Date("2025-10-28"),
    $lt: new Date("2025-10-29")
  },
  session: "morning"
}
```

### Afternoon Session Query
```javascript
{
  date: {
    $gte: new Date("2025-10-28"),
    $lt: new Date("2025-10-29")
  },
  session: "afternoon"
}
```

## Calculation Logic

```javascript
// For each session
sessionDocs.forEach(doc => {
  if (doc.students && Array.isArray(doc.students)) {
    doc.students.forEach(student => {
      const status = student.status?.toLowerCase();
      if (status === 'present') {
        totalPresent++;
      } else if (status === 'absent') {
        totalAbsent++;
      } else if (status === 'half-day') {
        totalHalfDay++;
      }
    });
  }
});

const attendanceRate = (totalPresent / totalRecords) * 100;
```

## Integration

The session-based charts integrate with:

1. **Overall Attendance Rate**: Shows combined rate across all sessions
2. **Weekly Attendance Graph**: Shows daily trends
3. **Attendance Marking**: Data comes from mark-session endpoint
4. **Reports**: Can be used for session-wise reporting

## Testing

Once MongoDB is connected:

1. **Mark morning attendance** for some students
2. **Mark afternoon attendance** for some students
3. **Refresh dashboard**
4. **Morning chart** should show morning session data
5. **Afternoon chart** should show afternoon session data
6. **Compare** the two sessions

### Expected Console Output
```
📊 Fetching today's attendance for: 2025-10-28
🌅 Morning attendance data: {
  success: true,
  session: "morning",
  presentCount: 235,
  absentCount: 15
}
🌆 Afternoon attendance data: {
  success: true,
  session: "afternoon",
  presentCount: 220,
  absentCount: 20
}
```

## Future Enhancements

1. **Session Comparison**: Add percentage difference indicator
2. **Alerts**: Notify if afternoon attendance drops significantly
3. **Historical Trends**: Show session-wise trends over time
4. **Class Breakdown**: Show session attendance by class
5. **Export**: Download session-wise reports
6. **Notifications**: Alert teachers about low afternoon attendance

## Responsive Design

- **Desktop (lg)**: Two columns side-by-side
- **Tablet (md)**: Two columns side-by-side
- **Mobile (sm)**: Stacked vertically

```css
grid-cols-1 lg:grid-cols-2
```

## Color Scheme

- **Morning Icon**: Yellow background (`bg-yellow-100`), Yellow icon (`text-yellow-600`)
- **Afternoon Icon**: Orange background (`bg-orange-100`), Orange icon (`text-orange-600`)
- **Present**: Green (`#10B981`)
- **Absent**: Red (`#EF4444`)

This provides a clear visual distinction between the two sessions!
