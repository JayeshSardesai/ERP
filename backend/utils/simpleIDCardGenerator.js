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
   * Wrap text into multiple lines based on maxWidth
   */
  wrapText(text, maxCharsPerLine = 40) {
    if (!text) return [];

    const words = String(text).split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Create multi-line text as SVG buffer for sharp composite
   */
  createMultiLineTextSVG(text, options = {}) {
    const {
      fontSize = 24,
      fontFamily = 'Arial',
      color = '#000000',
      fontWeight = 'bold',
      maxWidth = 400,
      lineHeight = 1.2,
      maxCharsPerLine = 40
    } = options;

    // Wrap text into multiple lines
    const lines = this.wrapText(text, maxCharsPerLine);

    // Calculate total height needed
    const totalHeight = lines.length * fontSize * lineHeight + 10;

    // Create SVG with multiple text elements
    const textElements = lines.map((line, index) => {
      const escapedLine = String(line)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      const y = fontSize + (index * fontSize * lineHeight);

      return `<text 
        x="0" 
        y="${y}" 
        font-family="${fontFamily}" 
        font-size="${fontSize}px" 
        font-weight="${fontWeight}"
        fill="${color}"
      >${escapedLine}</text>`;
    }).join('\n');

    const svg = `
      <svg width="${maxWidth}" height="${totalHeight}">
        ${textElements}
      </svg>
    `;

    return Buffer.from(svg);
  }

  /**
   * Create text as SVG buffer for sharp composite (single line)
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
        schoolLogo: { x: 170, y: 60, width: 80, height: 80 },
        schoolName: { x: 265, y: 58, fontSize: 34, fontWeight: 'bold', maxWidth: 700, multiLine: true, maxCharsPerLine: 70, lineHeight: 1.2 },
        schoolAddress: { x: 265, y: 105, fontSize: 20, fontWeight: 'normal', maxWidth: 700, multiLine: true, maxCharsPerLine: 80, lineHeight: 1.0 },
        photo: { x: 60, y: 180, width: 235, height: 300 },
        name: { x: 580, y: 203, fontSize: 26 },
        idNumber: { x: 580, y: 253, fontSize: 26 },
        classSection: { x: 580, y: 302, fontSize: 26 },
        dob: { x: 580, y: 348, fontSize: 26 },
        bloodGroup: { x: 585, y: 397, fontSize: 26 }
      };
    } else if (orientation === 'landscape' && side === 'back') {
      return {
        address: { x: 400, y: 116, fontSize: 23, fontWeight: 'bold', maxWidth: 500, multiLine: true, maxCharsPerLine: 45, lineHeight: 1.3 },
        mobile: { x: 520, y: 183, fontSize: 23, fontWeight: 'bold', maxWidth: 200 },
        returnSchoolName: { x: 270, y: 415, fontSize: 23, fontWeight: 'bold', maxWidth: 750, multiLine: true, maxCharsPerLine: 50, lineHeight: 1.2 },
        returnAddress: { x: 270, y: 450, fontSize: 23, fontWeight: 'bold', maxWidth: 650, multiLine: true, maxCharsPerLine: 50, lineHeight: 1.2 },
        schoolPhone: { x: 270, y: 510, fontSize: 20, fontWeight: 'bold', maxWidth: 650 },
        schoolEmail: { x: 470, y: 510, fontSize: 20, fontWeight: 'bold', maxWidth: 650 }
      };
    } else if (orientation === 'portrait' && side === 'front') {
      return {
        schoolLogo: { x: 70, y: 50, width: 80, height: 80 },
        schoolName: { x: 185, y: 55, fontSize: 30, fontWeight: 'bold', maxWidth: 400, multiLine: true, maxCharsPerLine: 50, lineHeight: 1.2 },
        schoolAddress: { x: 185, y: 95, fontSize: 14, fontWeight: 'normal', maxWidth: 500, multiLine: true, maxCharsPerLine: 60, lineHeight: 1.2 },
        photo: { x: 175, y: 195, width: 240, height: 300 },
        name: { x: 340, y: 557, fontSize: 24, fontWeight: 'bold' },
        idNumber: { x: 340, y: 605, fontSize: 24, fontWeight: 'bold' },
        classSection: { x: 340, y: 655, fontSize: 24, fontWeight: 'bold' },
        dob: { x: 340, y: 700, fontSize: 24, fontWeight: 'bold' },
        bloodGroup: { x: 340, y: 750, fontSize: 24, fontWeight: 'bold' }
      };
    } else if (orientation === 'portrait' && side === 'back') {
      return {
        address: { x: 75, y: 100, fontSize: 24, fontWeight: 'bold', maxWidth: 450, multiLine: true, maxCharsPerLine: 38, lineHeight: 1.3 },
        mobile: { x: 295, y: 202, fontSize: 24, fontWeight: 'bold' },
        returnSchoolName: { x: 70, y: 540, fontSize: 24, fontWeight: 'bold', maxWidth: 450, multiLine: true, maxCharsPerLine: 38, lineHeight: 1.2 },
        returnAddress: { x: 70, y: 575, fontSize: 24, fontWeight: 'bold', maxWidth: 450, multiLine: true, maxCharsPerLine: 38, lineHeight: 1.2 },
        schoolPhone: { x: 70, y: 650, fontSize: 24, fontWeight: 'bold', maxWidth: 420 },
        schoolEmail: { x: 70, y: 680, fontSize: 24, fontWeight: 'bold', maxWidth: 420 }
      };
    }
    return {};
  }

  /**
   * Generate a single ID card
   */
  async generateIDCard(student, orientation = 'landscape', side = 'front', schoolInfo = {}) {
    try {
      console.log(`🎨 Generating ${orientation} ${side} ID card for:`, {
        name: student.name,
        id: student._id,
        orientation,
        side,
        hasPhoto: !!student.profileImage
      });

      // Get template path
      const templatePath = path.join(this.templatesDir, `${orientation}-${side}.png`);

      console.log(`📁 Looking for template at: ${templatePath}`);

      // Check if template exists
      try {
        await fs.access(templatePath);
        console.log(`✅ Template found: ${orientation}-${side}.png`);
      } catch (error) {
        console.error(`❌ Template not found: ${templatePath}`);
        console.error(`❌ Templates directory: ${this.templatesDir}`);
        throw new Error(`Template not found: ${orientation}-${side}.png. Please add it to backend/idcard-templates/`);
      }

      // Read template
      const templateBuffer = await fs.readFile(templatePath);

      // Get field positions
      const positions = this.getFieldPositions(orientation, side);

      // Prepare composite layers
      const compositeImages = [];

      // Add school logo (FRONT SIDE ONLY)
      if (side === 'front' && positions.schoolLogo && schoolInfo.logoUrl) {
        try {
          let logoPath = schoolInfo.logoUrl;

          // Handle relative paths
          if (logoPath.startsWith('/uploads')) {
            logoPath = path.join(__dirname, '..', logoPath);
          }

          // Check if file exists
          await fs.access(logoPath);

          // Resize and add logo
          const logoBuffer = await sharp(logoPath)
            .resize(positions.schoolLogo.width, positions.schoolLogo.height, {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .toBuffer();

          compositeImages.push({
            input: logoBuffer,
            top: positions.schoolLogo.y,
            left: positions.schoolLogo.x
          });
        } catch (logoError) {
          console.warn('School logo processing skipped:', logoError.message);
        }
      }

      // Add school name (FRONT SIDE ONLY)
      if (side === 'front' && positions.schoolName && schoolInfo.schoolName) {
        const textMethod = positions.schoolName.multiLine ? 'createMultiLineTextSVG' : 'createTextSVG';
        compositeImages.push({
          input: this[textMethod](schoolInfo.schoolName, {
            fontSize: positions.schoolName.fontSize,
            color: '#000000',
            fontWeight: positions.schoolName.fontWeight || 'bold',
            maxWidth: positions.schoolName.maxWidth || 400,
            maxCharsPerLine: positions.schoolName.maxCharsPerLine || 40,
            lineHeight: positions.schoolName.lineHeight || 1.2
          }),
          top: positions.schoolName.y,
          left: positions.schoolName.x
        });
      }

      // Add school address (FRONT SIDE ONLY)
      if (side === 'front' && positions.schoolAddress && schoolInfo.address) {
        const textMethod = positions.schoolAddress.multiLine ? 'createMultiLineTextSVG' : 'createTextSVG';
        compositeImages.push({
          input: this[textMethod](schoolInfo.address, {
            fontSize: positions.schoolAddress.fontSize,
            color: '#333333',
            fontWeight: positions.schoolAddress.fontWeight || 'normal',
            maxWidth: positions.schoolAddress.maxWidth || 400,
            maxCharsPerLine: positions.schoolAddress.maxCharsPerLine || 35,
            lineHeight: positions.schoolAddress.lineHeight || 1.2
          }),
          top: positions.schoolAddress.y,
          left: positions.schoolAddress.x
        });
      }

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
        // Front side fields - NO LABELS, just values (labels already on template)
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
        // Back side fields with labels

        // Local Address label (already on template, just add value after colon)
        if (positions.address && student.address) {
          const textMethod = positions.address.multiLine ? 'createMultiLineTextSVG' : 'createTextSVG';
          compositeImages.push({
            input: this[textMethod](student.address, {
              fontSize: positions.address.fontSize,
              color: '#000000',
              fontWeight: positions.address.fontWeight || 'normal',
              maxWidth: positions.address.maxWidth || 600,
              maxCharsPerLine: positions.address.maxCharsPerLine || 40,
              lineHeight: positions.address.lineHeight || 1.2
            }),
            top: positions.address.y,
            left: positions.address.x
          });
        }

        // Mobile label (already on template, just add value after colon)
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

        // "If found return to" section - Add school name and address
        if (positions.returnSchoolName && schoolInfo.schoolName) {
          const textMethod = positions.returnSchoolName.multiLine ? 'createMultiLineTextSVG' : 'createTextSVG';
          compositeImages.push({
            input: this[textMethod](schoolInfo.schoolName, {
              fontSize: positions.returnSchoolName.fontSize,
              color: '#000000',
              fontWeight: positions.returnSchoolName.fontWeight || 'bold',
              maxWidth: positions.returnSchoolName.maxWidth || 600,
              maxCharsPerLine: positions.returnSchoolName.maxCharsPerLine || 40,
              lineHeight: positions.returnSchoolName.lineHeight || 1.2
            }),
            top: positions.returnSchoolName.y,
            left: positions.returnSchoolName.x
          });
        }

        if (positions.returnAddress && schoolInfo.address) {
          const textMethod = positions.returnAddress.multiLine ? 'createMultiLineTextSVG' : 'createTextSVG';
          compositeImages.push({
            input: this[textMethod](schoolInfo.address, {
              fontSize: positions.returnAddress.fontSize,
              color: '#000000',
              fontWeight: positions.returnAddress.fontWeight || 'normal',
              maxWidth: positions.returnAddress.maxWidth || 600,
              maxCharsPerLine: positions.returnAddress.maxCharsPerLine || 40,
              lineHeight: positions.returnAddress.lineHeight || 1.2
            }),
            top: positions.returnAddress.y,
            left: positions.returnAddress.x
          });
        }

        // Add school phone (BACK SIDE ONLY)
        if (positions.schoolPhone && schoolInfo.phone) {
          compositeImages.push({
            input: this.createTextSVG(`Phone: ${schoolInfo.phone}`, {
              fontSize: positions.schoolPhone.fontSize,
              color: '#000000',
              fontWeight: positions.schoolPhone.fontWeight || 'normal',
              maxWidth: positions.schoolPhone.maxWidth || 600
            }),
            top: positions.schoolPhone.y,
            left: positions.schoolPhone.x
          });
        }

        // Add school email (BACK SIDE ONLY)
        if (positions.schoolEmail && schoolInfo.email) {
          compositeImages.push({
            input: this.createTextSVG(`Email: ${schoolInfo.email}`, {
              fontSize: positions.schoolEmail.fontSize,
              color: '#000000',
              fontWeight: positions.schoolEmail.fontWeight || 'normal',
              maxWidth: positions.schoolEmail.maxWidth || 600
            }),
            top: positions.schoolEmail.y,
            left: positions.schoolEmail.x
          });
        }
      }

      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Generate output filename using sequence ID
      const studentId = student.sequenceId || student.rollNumber || student._id;
      const outputFilename = `${studentId}_${side}.png`;
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
    console.log(`📦 Bulk generation started:`, {
      studentCount: students.length,
      orientation,
      includeBack,
      schoolInfo: {
        hasSchoolName: !!schoolInfo.schoolName,
        hasAddress: !!schoolInfo.address,
        hasLogo: !!schoolInfo.logoUrl
      }
    });

    const results = {
      success: [],
      failed: []
    };

    for (const student of students) {
      try {
        console.log(`\n🔄 Processing student: ${student.name} with orientation: ${orientation}`);

        // Generate front
        const frontResult = await this.generateIDCard(student, orientation, 'front', schoolInfo);
        console.log(`✅ Front card generated: ${frontResult.relativePath}`);

        let backResult = null;
        if (includeBack) {
          // Generate back
          backResult = await this.generateIDCard(student, orientation, 'back', schoolInfo);
          console.log(`✅ Back card generated: ${backResult.relativePath}`);
        }

        results.success.push({
          studentId: student._id,
          sequenceId: student.sequenceId || student.rollNumber || student._id,
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
