const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * Simple ID Card Generator
 * Overlays student information directly on PNG template images
 */

class SimpleIDCardGenerator {
  constructor() {
    this.templatesDir = path.join(__dirname, '..', 'idcard-templates');
    this.outputDir = path.join(__dirname, '..', 'uploads', 'generated-idcards');
  }

  /**
   * Create text as SVG buffer for sharp composite
   */
  createTextSVG(text, options = {}) {
    const {
      fontSize = 24,
      fontFamily = 'Arial',
      color = '#000000',
      fontWeight = 'bold',
      maxWidth = 400
    } = options;

    // Escape XML special characters
    const escapedText = String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const svg = `
      <svg width="${maxWidth}" height="${fontSize + 10}">
        <text 
          x="0" 
          y="${fontSize}" 
          font-family="${fontFamily}" 
          font-size="${fontSize}px" 
          font-weight="${fontWeight}"
          fill="${color}"
        >${escapedText}</text>
      </svg>
    `;

    return Buffer.from(svg);
  }

  /**
   * Get field positions based on orientation and side
   */
  getFieldPositions(orientation, side) {
    if (orientation === 'landscape' && side === 'front') {
      return {
        photo: { x: 60, y: 180, width: 235, height: 295 },
        name: { x: 347, y: 220, fontSize: 28 },
        idNumber: { x: 347, y: 270, fontSize: 24 },
        classSection: { x: 347, y: 320, fontSize: 22 },
        dob: { x: 347, y: 370, fontSize: 20 },
        bloodGroup: { x: 347, y: 420, fontSize: 20 }
      };
    } else if (orientation === 'landscape' && side === 'back') {
      return {
        address: { x: 46, y: 133, fontSize: 18 },
        mobile: { x: 384, y: 197, fontSize: 18 },
        returnAddress: { x: 127, y: 382, fontSize: 16, maxWidth: 800 }
      };
    } else if (orientation === 'portrait' && side === 'front') {
      return {
        photo: { x: 178, y: 190, width: 295, height: 340 },
        name: { x: 119, y: 571, fontSize: 26 },
        idNumber: { x: 295, y: 618, fontSize: 22 },
        classSection: { x: 295, y: 668, fontSize: 22 },
        dob: { x: 295, y: 714, fontSize: 20 },
        bloodGroup: { x: 295, y: 760, fontSize: 20 }
      };
    } else if (orientation === 'portrait' && side === 'back') {
      return {
        address: { x: 294, y: 217, fontSize: 18 },
        mobile: { x: 294, y: 295, fontSize: 18 },
        returnAddress: { x: 294, y: 513, fontSize: 16, maxWidth: 600 }
      };
    }
    return {};
  }

  /**
   * Generate a single ID card
   */
  async generateIDCard(student, orientation = 'landscape', side = 'front', schoolInfo = {}) {
    try {
      console.log(`🎨 Generating ${side} ID card for:`, {
        name: student.name,
        id: student._id,
        orientation,
        hasPhoto: !!student.profileImage
      });

      // Get template path
      const templatePath = path.join(this.templatesDir, `${orientation}-${side}.png`);
      
      // Check if template exists
      try {
        await fs.access(templatePath);
        console.log(`✅ Template found: ${orientation}-${side}.png`);
      } catch (error) {
        console.error(`❌ Template not found: ${templatePath}`);
        throw new Error(`Template not found: ${orientation}-${side}.png. Please add it to backend/idcard-templates/`);
      }

      // Read template
      const templateBuffer = await fs.readFile(templatePath);

      // Get field positions
      const positions = this.getFieldPositions(orientation, side);

      // Prepare composite layers
      const compositeImages = [];

      // Add student photo (front side only)
      if (side === 'front' && positions.photo && student.profileImage) {
        try {
          let photoPath = student.profileImage;
          
          // Handle relative paths
          if (photoPath.startsWith('/uploads')) {
            photoPath = path.join(__dirname, '..', photoPath);
          }

          // Check if file exists
          await fs.access(photoPath);

          // Resize and add photo
          const photoBuffer = await sharp(photoPath)
            .resize(positions.photo.width, positions.photo.height, {
              fit: 'cover',
              position: 'center'
            })
            .toBuffer();

          compositeImages.push({
            input: photoBuffer,
            top: positions.photo.y,
            left: positions.photo.x
          });
        } catch (photoError) {
          console.warn('Photo processing skipped:', photoError.message);
        }
      }

      // Add text fields based on side
      if (side === 'front') {
        // Front side fields
        if (positions.name) {
          compositeImages.push({
            input: this.createTextSVG(student.name, {
              fontSize: positions.name.fontSize,
              color: '#000000',
              fontWeight: 'bold'
            }),
            top: positions.name.y,
            left: positions.name.x
          });
        }

        if (positions.idNumber) {
          compositeImages.push({
            input: this.createTextSVG(student.sequenceId || student.rollNumber || student._id, {
              fontSize: positions.idNumber.fontSize,
              color: '#000000',
              fontWeight: 'bold'
            }),
            top: positions.idNumber.y,
            left: positions.idNumber.x
          });
        }

        if (positions.classSection && student.className && student.section) {
          compositeImages.push({
            input: this.createTextSVG(`${student.className} - ${student.section}`, {
              fontSize: positions.classSection.fontSize,
              color: '#000000',
              fontWeight: 'bold'
            }),
            top: positions.classSection.y,
            left: positions.classSection.x
          });
        } else if (positions.classSection && student.className) {
          compositeImages.push({
            input: this.createTextSVG(student.className, {
              fontSize: positions.classSection.fontSize,
              color: '#000000',
              fontWeight: 'bold'
            }),
            top: positions.classSection.y,
            left: positions.classSection.x
          });
        }

        if (positions.dob && student.dateOfBirth) {
          compositeImages.push({
            input: this.createTextSVG(student.dateOfBirth, {
              fontSize: positions.dob.fontSize,
              color: '#000000',
              fontWeight: 'bold'
            }),
            top: positions.dob.y,
            left: positions.dob.x
          });
        }

        if (positions.bloodGroup && student.bloodGroup) {
          compositeImages.push({
            input: this.createTextSVG(student.bloodGroup, {
              fontSize: positions.bloodGroup.fontSize,
              color: '#000000',
              fontWeight: 'bold'
            }),
            top: positions.bloodGroup.y,
            left: positions.bloodGroup.x
          });
        }
      } else {
        // Back side fields
        if (positions.address && student.address) {
          compositeImages.push({
            input: this.createTextSVG(student.address, {
              fontSize: positions.address.fontSize,
              color: '#000000',
              fontWeight: 'normal'
            }),
            top: positions.address.y,
            left: positions.address.x
          });
        }

        if (positions.mobile && (student.phone || student.contactNumber)) {
          compositeImages.push({
            input: this.createTextSVG(student.phone || student.contactNumber, {
              fontSize: positions.mobile.fontSize,
              color: '#000000',
              fontWeight: 'normal'
            }),
            top: positions.mobile.y,
            left: positions.mobile.x
          });
        }

        if (positions.returnAddress && schoolInfo.address) {
          compositeImages.push({
            input: this.createTextSVG(schoolInfo.address, {
              fontSize: positions.returnAddress.fontSize,
              color: '#000000',
              fontWeight: 'normal',
              maxWidth: positions.returnAddress.maxWidth
            }),
            top: positions.returnAddress.y,
            left: positions.returnAddress.x
          });
        }
      }

      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Generate output filename
      const studentName = student.name.replace(/[^a-zA-Z0-9]/g, '_');
      const studentId = student.sequenceId || student.rollNumber || student._id;
      const outputFilename = `${studentName}_${studentId}_${orientation}_${side}.png`;
      const outputPath = path.join(this.outputDir, outputFilename);

      // Composite everything on template
      await sharp(templateBuffer)
        .composite(compositeImages)
        .png({ quality: 100 })
        .toFile(outputPath);

      console.log(`✅ ID card generated: ${outputFilename}`);

      return {
        success: true,
        outputPath,
        relativePath: `/uploads/generated-idcards/${outputFilename}`,
        message: 'ID card generated successfully'
      };
    } catch (error) {
      console.error(`❌ Error generating ID card for ${student.name}:`, error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        student: {
          name: student.name,
          id: student._id,
          className: student.className,
          section: student.section
        }
      });
      throw error;
    }
  }

  /**
   * Generate ID cards for multiple students
   */
  async generateBulkIDCards(students, orientation = 'landscape', includeBack = true, schoolInfo = {}) {
    const results = {
      success: [],
      failed: []
    };

    for (const student of students) {
      try {
        // Generate front
        const frontResult = await this.generateIDCard(student, orientation, 'front', schoolInfo);
        
        let backResult = null;
        if (includeBack) {
          // Generate back
          backResult = await this.generateIDCard(student, orientation, 'back', schoolInfo);
        }

        results.success.push({
          studentId: student._id,
          studentName: student.name,
          frontCard: frontResult.relativePath,
          backCard: backResult ? backResult.relativePath : null
        });
      } catch (error) {
        console.error(`Failed to generate ID card for ${student.name}:`, error);
        results.failed.push({
          studentId: student._id,
          studentName: student.name,
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = new SimpleIDCardGenerator();
