# Integration Guide - Simple ID Card Generation

## ⚠️ IMPORTANT: Which Files to Use

### ✅ USE THESE (New Simple System):
- **Backend**:
  - `backend/utils/simpleIDCardGenerator.js` ✅
  - `backend/controllers/simpleIDCardController.js` ✅
  - `backend/routes/idCardTemplates.js` (updated) ✅
  
- **Frontend**:
  - `frontend/src/components/SimpleIDCardGenerator.tsx` ✅

- **Templates Folder**:
  - `backend/idcard-templates/` (Put your PNG files here) ✅

### ❌ DO NOT USE (Old React-based system):
- `frontend/src/components/EnhancedIDCardPreview.tsx` ❌
- `frontend/src/components/IDCardPreview.tsx` ❌
- `frontend/src/components/templates/NewIDCardTemplate.tsx` ❌
- `frontend/src/components/templates/CustomIDCardTemplate.tsx` ❌
- `frontend/src/components/templates/IDCardTemplate.tsx` ❌

## 📋 Step-by-Step Integration

### Step 1: Add PNG Templates
Place these 4 files in `backend/idcard-templates/`:
```
landscape-front.png
landscape-back.png
portrait-front.png
portrait-back.png
```

### Step 2: Integrate in Your Student List Page

Find your student list component (e.g., `StudentList.tsx` or `AcademicDetails.tsx`) and add:

```tsx
import SimpleIDCardGenerator from '../components/SimpleIDCardGenerator';
import { useState } from 'react';

// Inside your component:
const [showIDCardGenerator, setShowIDCardGenerator] = useState(false);
const [selectedStudents, setSelectedStudents] = useState<any[]>([]);

// Add a button in your UI:
<button
  onClick={() => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }
    setShowIDCardGenerator(true);
  }}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
  disabled={selectedStudents.length === 0}
>
  Generate ID Cards ({selectedStudents.length})
</button>

// Add the component at the end of your JSX:
{showIDCardGenerator && (
  <SimpleIDCardGenerator
    selectedStudents={selectedStudents}
    onClose={() => setShowIDCardGenerator(false)}
  />
)}
```

### Step 3: Student Selection Logic

Make sure you have a way to select students. Example:

```tsx
const handleStudentSelect = (student: any) => {
  setSelectedStudents(prev => {
    const exists = prev.find(s => s._id === student._id);
    if (exists) {
      return prev.filter(s => s._id !== student._id);
    }
    return [...prev, student];
  });
};

// In your student list rendering:
{students.map(student => (
  <div key={student._id}>
    <input
      type="checkbox"
      checked={selectedStudents.some(s => s._id === student._id)}
      onChange={() => handleStudentSelect(student)}
    />
    {student.name}
  </div>
))}
```

## 🎯 How It Works

1. **User selects students** from your student list
2. **Clicks "Generate ID Cards"** button
3. **SimpleIDCardGenerator modal opens**
4. **User chooses**:
   - Orientation (landscape/portrait)
   - Include back side (yes/no)
5. **Clicks "Generate & Preview"** or **"Download ZIP"**
6. **Backend**:
   - Reads PNG template from `backend/idcard-templates/`
   - Uses Sharp to overlay student info at predefined positions
   - Saves to `backend/uploads/generated-idcards/`
7. **Frontend**:
   - Shows preview of generated cards
   - Allows downloading individual cards or all as ZIP

## 🔧 Adjusting Field Positions

If text doesn't align with your template, edit `backend/utils/simpleIDCardGenerator.js`:

```javascript
getFieldPositions(orientation, side) {
  if (orientation === 'landscape' && side === 'front') {
    return {
      photo: { x: 60, y: 180, width: 235, height: 295 },
      name: { x: 347, y: 220, fontSize: 28 },
      idNumber: { x: 347, y: 270, fontSize: 24 },
      // Adjust these x, y coordinates to match your template
    };
  }
  // ... other orientations
}
```

## 📝 API Endpoints Available

```
POST /api/idcard-templates/generate
- Body: { studentIds: [], orientation: 'landscape', includeBack: true }
- Returns: List of generated card paths

POST /api/idcard-templates/download
- Body: { studentIds: [], orientation: 'landscape', includeBack: true }
- Returns: ZIP file download

GET /api/idcard-templates/preview?studentId=xxx&orientation=landscape&side=front
- Returns: Single card image preview
```

## ✅ Testing Checklist

- [ ] PNG templates placed in `backend/idcard-templates/`
- [ ] Backend server restarted
- [ ] Frontend using `SimpleIDCardGenerator` component
- [ ] Can select students
- [ ] "Generate ID Cards" button appears
- [ ] Modal opens when clicked
- [ ] Can choose orientation
- [ ] Generate button works
- [ ] Preview shows generated cards
- [ ] Download ZIP works
- [ ] Generated files appear in `backend/uploads/generated-idcards/`

## 🐛 Common Issues

### Issue: "Template not found"
**Solution**: Make sure PNG files are named exactly:
- `landscape-front.png`
- `landscape-back.png`
- `portrait-front.png`
- `portrait-back.png`

### Issue: Text not aligned
**Solution**: Edit coordinates in `getFieldPositions()` method

### Issue: Photos not showing
**Solution**: Check student has `profileImage` field and file exists

### Issue: Old components still showing
**Solution**: Make sure you're importing `SimpleIDCardGenerator`, not `IDCardPreview` or `EnhancedIDCardPreview`

## 🎨 Example Student List Integration

```tsx
// StudentList.tsx or AcademicDetails.tsx
import React, { useState } from 'react';
import SimpleIDCardGenerator from '../components/SimpleIDCardGenerator';
import toast from 'react-hot-toast';

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showIDCardGen, setShowIDCardGen] = useState(false);

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents([...students]);
    }
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2>Students</h2>
        <div className="flex gap-2">
          <button onClick={handleSelectAll}>
            {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
          </button>
          <button
            onClick={() => setShowIDCardGen(true)}
            disabled={selectedStudents.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Generate ID Cards ({selectedStudents.length})
          </button>
        </div>
      </div>

      {/* Student list with checkboxes */}
      <div className="space-y-2">
        {students.map(student => (
          <div key={student._id} className="flex items-center gap-2 p-2 border rounded">
            <input
              type="checkbox"
              checked={selectedStudents.some(s => s._id === student._id)}
              onChange={() => {
                setSelectedStudents(prev => {
                  const exists = prev.find(s => s._id === student._id);
                  if (exists) {
                    return prev.filter(s => s._id !== student._id);
                  }
                  return [...prev, student];
                });
              }}
            />
            <span>{student.name}</span>
            <span className="text-sm text-gray-500">
              {student.className} - {student.section}
            </span>
          </div>
        ))}
      </div>

      {/* ID Card Generator Modal */}
      {showIDCardGen && (
        <SimpleIDCardGenerator
          selectedStudents={selectedStudents}
          onClose={() => setShowIDCardGen(false)}
        />
      )}
    </div>
  );
};

export default StudentList;
```

## 🚀 Quick Start

1. **Add templates**: Copy 4 PNG files to `backend/idcard-templates/`
2. **Restart backend**: `cd backend && npm run dev`
3. **Add button**: Import and use `SimpleIDCardGenerator` in your student list
4. **Test**: Select students → Click button → Generate cards

That's it! No database setup, no complex configuration. Just PNG templates and Sharp!
