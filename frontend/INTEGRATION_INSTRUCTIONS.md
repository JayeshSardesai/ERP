# ID Card System Integration Instructions

## ✅ What's Been Created:

### 1. **IDCardPreview Component** (`src/components/IDCardPreview.tsx`)
- **Separate preview page** for ID cards as requested
- **Individual student cards** with front/back preview
- **Download buttons** for individual and bulk generation
- **Proper image generation** using html2canvas and JSZip
- **Folder organization** by student sequence ID

### 2. **useTemplateData Hook** (`src/roles/admin/hooks/useTemplateData.ts`)
- **Template settings management**
- **School data integration**
- **localStorage persistence**

### 3. **Dependencies Added** (`package.json`)
- `html2canvas`: ^1.4.1
- `jszip`: ^3.10.1
- `@types/jszip`: ^3.4.1

## 🔧 Integration Steps:

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Add Preview Button to AcademicDetails.tsx
Replace the existing ID card generation button with:

```tsx
// Add this button after orientation selection
<button
  onClick={() => {
    if (idCardStudents.length > 0 && selectedOrientation) {
      setShowPreview(true);
    } else {
      toast.error('Please select orientation and load students first');
    }
  }}
  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
>
  <CreditCard className="h-5 w-5" />
  Preview & Generate ID Cards
</button>
```

### Step 3: Add Conditional Rendering
At the end of the AcademicDetails component, before the closing div:

```tsx
{/* ID Card Preview */}
{showPreview && idCardStudents.length > 0 && selectedOrientation && (
  <IDCardPreview
    students={idCardStudents}
    orientation={selectedOrientation as 'landscape' | 'portrait'}
    onBack={() => setShowPreview(false)}
    className={idCardClass}
    section={idCardSection}
  />
)}
```

### Step 4: Fix Student Data Fetching
Update the `fetchStudentsForIdCards` function to include all required fields:

```tsx
const studentsWithData = filteredStudents.map((student: any, index: number) => ({
  id: student._id || student.id,
  name: student.name?.displayName || `${student.name?.firstName || ''} ${student.name?.lastName || ''}`.trim() || 'Unknown Student',
  rollNumber: student.studentDetails?.rollNumber || student.rollNumber || `${schoolCode}-${idCardSection}-${String(index + 1).padStart(4, '0')}`,
  sequenceId: student.userId || student.studentDetails?.admissionNumber || `${schoolCode}-${idCardSection}-${String(index + 1).padStart(4, '0')}`,
  className: idCardClass,
  section: idCardSection,
  // Proper image URL construction
  profileImage: (() => {
    const rawImageUrl = student.profileImage || student.profilePicture;
    if (!rawImageUrl) return null;
    if (rawImageUrl.startsWith('/uploads')) {
      const envBase = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5050/api';
      const baseUrl = envBase.replace(/\/api\/?$/, '');
      return `${baseUrl}${rawImageUrl}`;
    }
    return rawImageUrl;
  })(),
  // Additional fields for ID cards
  fatherName: student.parentDetails?.fatherName || student.fatherName || student.parent?.father?.name || 'Not Available',
  motherName: student.parentDetails?.motherName || student.motherName || student.parent?.mother?.name || 'Not Available',
  dateOfBirth: student.personalDetails?.dateOfBirth || student.dateOfBirth || student.dob || student.personal?.dateOfBirth || 'Not Available',
  bloodGroup: student.personalDetails?.bloodGroup || student.bloodGroup || student.personal?.bloodGroup || student.medicalInfo?.bloodGroup || 'Not Available',
  address: student.address?.permanent?.street || student.address?.street || student.personalDetails?.address || student.address || 'Not Available',
  phone: student.contact?.primaryPhone || student.contact?.phone || student.phone || student.personalDetails?.phone || 'Not Available'
}));
```

## 🎯 Features Implemented:

### **Separate Preview Page**
- ✅ Opens in same window but different component
- ✅ Back button to return to main page
- ✅ Clean, organized layout

### **Individual Student Cards**
- ✅ Each student gets their own card display
- ✅ Front and back preview side by side
- ✅ Individual download button per student
- ✅ Student info displayed (DOB, blood group, parent name)

### **Photo Generation**
- ✅ High-quality PNG images (3x scale)
- ✅ Proper folder structure by sequence ID
- ✅ ZIP download with organized folders
- ✅ Both individual and bulk generation

### **School Logo Integration**
- ✅ Fetches school logo from API
- ✅ Proper URL construction for uploaded images
- ✅ Displays in ID card template

### **Student Data**
- ✅ Complete student information fetching
- ✅ Profile images with proper URLs
- ✅ All required fields (DOB, blood group, parent names)
- ✅ Fallback values for missing data

## 📁 Generated Folder Structure:
```
StudentID_ID_Card_orientation.zip
├── STU001_front.png
└── STU001_back.png

OR for bulk:

ID_Cards_Class_X_Section_A_landscape.zip
├── STU001/
│   ├── STU001_front.png
│   └── STU001_back.png
├── STU002/
│   ├── STU002_front.png
│   └── STU002_back.png
└── ...
```

## 🚀 Usage:
1. Select class and section
2. Load students
3. Choose orientation
4. Click "Preview & Generate ID Cards"
5. View all student cards with proper design
6. Download individual or bulk ZIP files

The system now provides exactly what you requested: proper preview, photo generation, folder organization, and complete student data integration!
