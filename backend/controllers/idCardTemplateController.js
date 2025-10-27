const IDCardTemplate = require('../models/IDCardTemplate');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Configure multer for template uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'templates');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `template-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'));
    }
  }
});

// Upload middleware
const uploadTemplate = upload.single('templateImage');

// Get all templates for a school
const getTemplates = async (req, res) => {
  try {
    const { schoolId } = req.user;
    const { orientation, side } = req.query;

    let query = { schoolId, isActive: true };
    if (orientation) query.orientation = orientation;
    if (side) query.side = side;

    const templates = await IDCardTemplate.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching templates',
      error: error.message
    });
  }
};

// Get a single template
const getTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { schoolId } = req.user;

    const template = await IDCardTemplate.findOne({
      _id: templateId,
      schoolId,
      isActive: true
    }).populate('createdBy', 'name email');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching template',
      error: error.message
    });
  }
};

// Create a new template
const createTemplate = async (req, res) => {
  try {
    const { schoolId, _id: userId } = req.user;
    const {
      name,
      description,
      orientation,
      side,
      dataFields,
      photoPlacement,
      schoolLogoPlacement
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Template image is required'
      });
    }

    // Process and optimize the uploaded image
    const originalPath = req.file.path;
    const optimizedPath = originalPath.replace(path.extname(originalPath), '_optimized.png');
    
    try {
      await sharp(originalPath)
        .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: 90 })
        .toFile(optimizedPath);
      
      // Remove original file and rename optimized version
      fs.unlinkSync(originalPath);
      fs.renameSync(optimizedPath, originalPath);
    } catch (imageError) {
      console.error('Image processing error:', imageError);
      // Continue with original file if processing fails
    }

    const template = new IDCardTemplate({
      schoolId,
      name,
      description,
      orientation,
      side,
      templateImage: `/uploads/templates/${req.file.filename}`,
      dataFields: dataFields || {},
      photoPlacement: photoPlacement || {},
      schoolLogoPlacement: schoolLogoPlacement || {},
      createdBy: userId
    });

    await template.save();

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating template',
      error: error.message
    });
  }
};

// Update template
const updateTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { schoolId, _id: userId } = req.user;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.schoolId;
    delete updateData.createdBy;
    delete updateData.createdAt;

    const template = await IDCardTemplate.findOneAndUpdate(
      { _id: templateId, schoolId },
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating template',
      error: error.message
    });
  }
};

// Delete template
const deleteTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { schoolId } = req.user;

    const template = await IDCardTemplate.findOneAndUpdate(
      { _id: templateId, schoolId },
      { isActive: false },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Optionally delete the file
    if (template.templateImage) {
      const filePath = path.join(__dirname, '..', template.templateImage);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting template',
      error: error.message
    });
  }
};

// Set default template
const setDefaultTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { schoolId } = req.user;
    const { orientation, side } = req.body;

    // Remove default status from other templates of same orientation/side
    await IDCardTemplate.updateMany(
      { schoolId, orientation, side },
      { isDefault: false }
    );

    // Set new default
    const template = await IDCardTemplate.findOneAndUpdate(
      { _id: templateId, schoolId },
      { isDefault: true },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Default template set successfully',
      data: template
    });
  } catch (error) {
    console.error('Error setting default template:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting default template',
      error: error.message
    });
  }
};

module.exports = {
  uploadTemplate,
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  setDefaultTemplate
};
