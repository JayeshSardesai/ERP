# Custom ID Card Template System

## Overview

This system allows administrators to upload custom ID card templates and generate student ID cards with personalized data overlay. The system supports both landscape and portrait orientations with front and back sides.

## Features

### ✅ Backend Features
- **Template Upload**: Upload custom template images (JPEG, PNG, GIF, WebP)
- **Template Management**: CRUD operations for templates
- **Image Processing**: Automatic image optimization using Sharp
- **Data Field Configuration**: Configurable placement of student data
- **Photo Placement**: Configurable student photo positioning
- **School Logo Support**: Optional school logo placement
- **Template Storage**: Secure file storage with organized directory structure

### ✅ Frontend Features
- **Template Manager**: Upload, preview, and manage templates
- **Template Configurator**: Visual configuration of data field positions
- **Enhanced Preview**: Real-time preview with sample data
- **Bulk Generation**: Generate ID cards for multiple students
- **ZIP Export**: Organized folder structure for generated cards
- **Template Selection**: Choose between default and custom templates

## System Architecture

### Backend Components

#### 1. Database Model (`backend/models/IDCardTemplate.js`)
```javascript
{
  schoolId: ObjectId,
  name: String,
  description: String,
  orientation: 'landscape' | 'portrait',
  side: 'front' | 'back',
  templateImage: String, // Path to uploaded image
  dataFields: {
    studentName: { x, y, fontSize, fontColor, fontFamily, enabled },
    studentId: { x, y, fontSize, fontColor, fontFamily, enabled },
    // ... other fields
  },
  photoPlacement: { x, y, width, height, enabled },
  schoolLogoPlacement: { x, y, width, height, enabled },
  isActive: Boolean,
  isDefault: Boolean
}
```

#### 2. API Endpoints (`backend/routes/idCardTemplates.js`)
- `GET /api/id-card-templates` - Get all templates
- `GET /api/id-card-templates/:id` - Get specific template
- `POST /api/id-card-templates` - Create new template
- `PUT /api/id-card-templates/:id` - Update template
- `DELETE /api/id-card-templates/:id` - Delete template
- `POST /api/id-card-templates/:id/set-default` - Set default template

#### 3. Controller (`backend/controllers/idCardTemplateController.js`)
- File upload handling with Multer
- Image processing with Sharp
- Template CRUD operations
- Default template management

### Frontend Components

#### 1. Template Manager (`frontend/src/components/TemplateManager.tsx`)
- Template upload interface
- Template list with preview
- Template selection
- Template deletion

#### 2. Custom ID Card Template (`frontend/src/components/templates/CustomIDCardTemplate.tsx`)
- Renders custom templates with student data
- Configurable field positioning
- Photo and logo placement
- Responsive design

#### 3. Template Configurator (`frontend/src/components/TemplateConfigurator.tsx`)
- Visual field positioning
- Drag-and-drop interface
- Real-time preview
- Configuration saving

#### 4. Enhanced ID Card Preview (`frontend/src/components/EnhancedIDCardPreview.tsx`)
- Template selection (default vs custom)
- Bulk generation
- Individual student preview
- ZIP export functionality

## Installation & Setup

### Backend Dependencies
The following packages are already installed:
- `sharp`: ^0.34.4 (Image processing)
- `multer`: ^2.0.2 (File upload handling)

### Frontend Dependencies
The following packages are already installed:
- `html2canvas`: ^1.4.1 (Canvas rendering)
- `jszip`: ^3.10.1 (ZIP file generation)

### Database Setup
The system uses the existing MongoDB connection. No additional setup required.

## Usage Guide

### 1. Upload Custom Template

1. Navigate to the ID Card generation section
2. Click "Manage Templates"
3. Click "Upload Template"
4. Fill in template details:
   - Name: Descriptive name for the template
   - Description: Optional description
   - Orientation: Landscape or Portrait
   - Side: Front or Back
   - Template Image: Upload your custom template image

### 2. Configure Template

1. After uploading, click "Configure" on the template
2. Use the visual configurator to position:
   - Student data fields (name, ID, class, etc.)
   - Student photo placement
   - School logo placement (optional)
3. Adjust font sizes, colors, and positioning
4. Save configuration

### 3. Generate ID Cards

1. Select students for ID card generation
2. Choose orientation (landscape/portrait)
3. Select template type:
   - Default Template: Uses built-in templates
   - Custom Template: Uses your uploaded templates
4. Preview individual cards
5. Generate bulk cards or individual downloads

## Template Configuration

### Data Fields
The system supports the following student data fields:
- Student Name
- Student ID/Roll Number
- Class Name
- Section
- Date of Birth
- Blood Group
- Father's Name
- Mother's Name
- Address
- Phone Number

### Photo Placement
- Configurable position (x, y coordinates)
- Adjustable size (width, height)
- Enable/disable photo display

### School Logo
- Optional logo placement
- Configurable position and size
- Uses school logo from settings

## File Structure

```
backend/
├── models/
│   └── IDCardTemplate.js
├── controllers/
│   └── idCardTemplateController.js
├── routes/
│   └── idCardTemplates.js
└── uploads/
    └── templates/
        └── [template-files]

frontend/src/
├── components/
│   ├── templates/
│   │   └── CustomIDCardTemplate.tsx
│   ├── TemplateManager.tsx
│   ├── TemplateConfigurator.tsx
│   └── EnhancedIDCardPreview.tsx
└── roles/admin/pages/
    └── AcademicDetails.tsx (updated)
```

## API Reference

### Template Endpoints

#### Upload Template
```http
POST /api/id-card-templates
Content-Type: multipart/form-data

{
  "name": "Custom Template",
  "description": "Template description",
  "orientation": "landscape",
  "side": "front",
  "templateImage": [file]
}
```

#### Get Templates
```http
GET /api/id-card-templates?orientation=landscape&side=front
```

#### Update Template
```http
PUT /api/id-card-templates/:id
Content-Type: application/json

{
  "dataFields": { ... },
  "photoPlacement": { ... },
  "schoolLogoPlacement": { ... }
}
```

## Technical Details

### Image Processing
- Templates are automatically optimized using Sharp
- Maximum file size: 20MB
- Supported formats: JPEG, PNG, GIF, WebP
- Images are resized to optimal dimensions

### Canvas Rendering
- Uses html2canvas for high-quality image generation
- Scale factor: 3x for crisp output
- CORS support for external images
- Background color: White

### ZIP Generation
- Organized folder structure by student
- Individual PNG files for front and back
- Batch processing for multiple students
- Automatic cleanup of temporary files

## Security Considerations

- File upload validation (type and size)
- Authentication required for all operations
- School-specific template isolation
- Secure file storage with unique naming

## Performance Optimizations

- Lazy loading of template images
- Efficient canvas rendering
- Batch processing for bulk operations
- Memory cleanup after generation

## Troubleshooting

### Common Issues

1. **Template not loading**
   - Check file format (JPEG, PNG, GIF, WebP)
   - Verify file size (< 20MB)
   - Ensure proper authentication

2. **Generation fails**
   - Check browser console for errors
   - Verify all dependencies are installed
   - Ensure sufficient memory for large batches

3. **Poor image quality**
   - Use high-resolution template images
   - Check canvas scale settings
   - Verify image format compatibility

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in backend environment.

## Future Enhancements

- [ ] Template categories and tags
- [ ] Batch template configuration
- [ ] Template versioning
- [ ] Advanced image filters
- [ ] QR code integration
- [ ] Barcode support
- [ ] Multi-language support
- [ ] Template marketplace

## Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Status**: Production Ready
