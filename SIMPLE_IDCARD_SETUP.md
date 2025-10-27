# Simple ID Card Generation - Setup Guide

## Overview
This is a simplified ID card generation system that uses PNG template images directly from a folder. No database template management needed!

## 📁 Folder Structure Created

```
backend/
├── idcard-templates/          # Store your PNG templates here
│   ├── landscape-front.png    # Required
│   ├── landscape-back.png     # Required
│   ├── portrait-front.png     # Required
│   └── portrait-back.png      # Required
├── uploads/
│   └── generated-idcards/     # Generated ID cards saved here
├── utils/
│   └── simpleIDCardGenerator.js
└── controllers/
    └── simpleIDCardController.js

frontend/
└── src/
    └── components/
        └── SimpleIDCardGenerator.tsx
```

## 🎯 Step 1: Add Your Template Images

1. **Navigate to**: `backend/idcard-templates/`
2. **Add your PNG files** with these exact names:
   - `landscape-front.png` (1020×648 pixels)
   - `landscape-back.png` (1020×648 pixels)
   - `portrait-front.png` (648×1020 pixels)
   - `portrait-back.png` (648×1020 pixels)

## 📝 Step 2: Field Positions (Pre-configured)

The system has pre-configured positions based on your template images:

### Landscape Front:
- **Photo**: x:60, y:180, size:235×295
- **Name**: x:347, y:220
- **ID Number**: x:347, y:270
- **Class/Section**: x:347, y:320
- **Date of Birth**: x:347, y:370
- **Blood Group**: x:347, y:420

### Landscape Back:
- **Address**: x:46, y:133
- **Mobile**: x:384, y:197
- **Return Address**: x:127, y:382

### Portrait Front:
- **Photo**: x:178, y:190, size:295×340
- **Name**: x:119, y:571
- **ID Number**: x:295, y:618
- **Class/Section**: x:295, y:668
- **Date of Birth**: x:295, y:714
- **Blood Group**: x:295, y:760

### Portrait Back:
- **Address**: x:294, y:217
- **Mobile**: x:294, y:295
- **Return Address**: x:294, y:513

> **Note**: If positions don't match your template, edit them in `backend/utils/simpleIDCardGenerator.js` in the `getFieldPositions()` method.

## 🚀 Step 3: Integration

### Add to Student List Page

```tsx
import SimpleIDCardGenerator from '../components/SimpleIDCardGenerator';

// Add state
const [showIDCardGenerator, setShowIDCardGenerator] = useState(false);
const [selectedStudents, setSelectedStudents] = useState([]);

// Add button
<button 
  onClick={() => setShowIDCardGenerator(true)}
  disabled={selectedStudents.length === 0}
>
  Generate ID Cards ({selectedStudents.length})
</button>

// Add component
{showIDCardGenerator && (
  <SimpleIDCardGenerator
    selectedStudents={selectedStudents}
    onClose={() => setShowIDCardGenerator(false)}
  />
)}
```

## 🎨 How It Works

1. **Select Students**: Choose students from your student list
2. **Choose Options**: 
   - Select orientation (landscape/portrait)
   - Include/exclude back side
3. **Generate**: 
   - Click "Generate & Preview" to see results
   - Or "Download ZIP" to get all cards at once
4. **Preview**: View individual cards before downloading
5. **Download**: Get all cards as a ZIP file

## 📋 API Endpoints

### Generate ID Cards
```
POST /api/idcard-templates/generate
Body: {
  studentIds: ["id1", "id2"],
  orientation: "landscape",
  includeBack: true
}
```

### Download as ZIP
```
POST /api/idcard-templates/download
Body: {
  studentIds: ["id1", "id2"],
  orientation: "landscape",
  includeBack: true
}
```

### Preview Single Card
```
GET /api/idcard-templates/preview?studentId=xxx&orientation=landscape&side=front
```

## 🔧 Customization

### Adjust Field Positions

Edit `backend/utils/simpleIDCardGenerator.js`:

```javascript
getFieldPositions(orientation, side) {
  if (orientation === 'landscape' && side === 'front') {
    return {
      photo: { x: 60, y: 180, width: 235, height: 295 },
      name: { x: 347, y: 220, fontSize: 28 },
      // ... adjust these values
    };
  }
  // ...
}
```

### Change Font Styles

In the same file, modify `createTextSVG()` method:

```javascript
createTextSVG(text, options = {}) {
  const {
    fontSize = 24,
    fontFamily = 'Arial',  // Change font
    color = '#000000',     // Change color
    fontWeight = 'bold',   // Change weight
    // ...
  } = options;
  // ...
}
```

## ✅ Testing

1. **Place Templates**: Add your 4 PNG files to `backend/idcard-templates/`
2. **Start Backend**: `cd backend && npm run dev`
3. **Start Frontend**: `cd frontend && npm run dev`
4. **Select Students**: Go to student list and select some students
5. **Generate**: Click "Generate ID Cards" button
6. **Check Output**: Generated cards will be in `backend/uploads/generated-idcards/`

## 📦 Output

Generated files are named:
```
{StudentName}_{StudentID}_landscape_front.png
{StudentName}_{StudentID}_landscape_back.png
```

Example:
```
John_Doe_STU001_landscape_front.png
John_Doe_STU001_landscape_back.png
```

## 🐛 Troubleshooting

### Error: "Template not found"
- Make sure PNG files are in `backend/idcard-templates/`
- Check file names match exactly: `landscape-front.png`, etc.

### Photos not appearing
- Check student has `profileImage` field
- Verify image file exists at the path
- Check file permissions

### Text not positioned correctly
- Adjust coordinates in `getFieldPositions()` method
- Use image editing software to find exact pixel positions
- Test with one student first

### ZIP download fails
- Check `archiver` package is installed: `npm install archiver`
- Verify disk space available
- Check server logs for errors

## 🎯 Advantages of This Approach

✅ **Simple**: No database template management
✅ **Fast**: Direct PNG overlay
✅ **Flexible**: Easy to adjust positions in code
✅ **Clean**: Separate templates folder
✅ **Portable**: Just copy PNG files to deploy

## 📝 Notes

- Templates are NOT stored in database
- Field positions are hardcoded in `simpleIDCardGenerator.js`
- To change template design, just replace PNG files
- Generated cards are temporary (can be deleted after download)
- High quality output (300 DPI) ready for printing
