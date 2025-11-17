const bcrypt = require('bcryptjs');
const SchoolDatabaseManager = require('./schoolDatabaseManager');
const { ObjectId } = require('mongodb');

class UserGenerator {

  /**
   * Generate a unique user ID based on school code and role
   */
  static async generateUserId(schoolCode, role) {
    try {
      // Use the same atomic counter system from userController
      const userController = require('../controllers/userController');
      return await userController.generateSequentialUserId(schoolCode, role);
    } catch (error) {
      console.error('Error generating user ID:', error);
      throw error;
    }
  }

  /**
   * Generate a random password
   */
  static generateRandomPassword(length = 8) {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';

    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return password;
  }

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Create a new user in the appropriate school collection
   * THIS IS THE CORRECTED, UPDATED FUNCTION
   */
  static async createUser(schoolCode, userData) {
    try {
      const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);

      // Generate user ID and a DEFAULT random password
      // This will be overridden for students if DOB is available
      const userId = await this.generateUserId(schoolCode, userData.role);
      let plainPassword = this.generateRandomPassword();
      let hashedPassword = await this.hashPassword(plainPassword);

      let userDocument = {
        userId,
        email: userData.email,
        password: hashedPassword,
        temporaryPassword: plainPassword,
        schoolCode,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // --- STUDENT STRUCTURE (MATCHING SchoolUser({...}) EXACTLY) ---
      if (userData.role.toLowerCase() === 'student') {

        const studentId = userId;
        const targetSchoolId = userData.schoolId || null;

        // <-- START: DOB Processing & Password Generation -->
        let dateOfBirth;
        let dobWasProvided = false; // Flag to track
        if (userData.dateOfBirth) {
          try {
            // Try parsing DD/MM/YYYY
            if (userData.dateOfBirth.includes('/')) {
              dateOfBirth = new Date(userData.dateOfBirth.split('/').reverse().join('-'));
            } else {
              // Assume it's an ISO string or other valid Date format
              dateOfBirth = new Date(userData.dateOfBirth);
            }
            if (isNaN(dateOfBirth.getTime())) {
              dateOfBirth = new Date(); // Fallback for invalid date
            } else {
              dobWasProvided = true; // A valid date was parsed
            }
          } catch (e) {
            dateOfBirth = new Date(); // Fallback for parsing error
          }
        } else {
          dateOfBirth = new Date(); // Fallback if no DOB provided
        }

        // --- OVERRIDE PASSWORD LOGIC (USER REQUEST) ---
        if (dobWasProvided) {
          const day = dateOfBirth.getDate().toString().padStart(2, '0');
          const month = (dateOfBirth.getMonth() + 1).toString().padStart(2, '0'); // getMonth() is 0-indexed
          const year = dateOfBirth.getFullYear().toString();
          plainPassword = `${day}${month}${year}`;
          hashedPassword = await this.hashPassword(plainPassword); // Re-hash!
          console.log(`🔑 Generated DOB password for ${userId}: ${plainPassword}`);
        } else {
          // Keep the default random password generated earlier
          console.log(`⚠️ DOB not provided for ${userId}. Using random password.`);
        }
        // <-- END: DOB Processing & Password Generation -->

        // <-- FIX: Reads from the nested studentNameEnglish object
        const firstName = userData.studentNameEnglish?.firstName || userData.firstName || 'Student';
        const lastName = userData.studentNameEnglish?.lastName || userData.lastName || 'User';
        const middleName = userData.studentNameEnglish?.middleName || userData.middleName || '';
        const name = `${firstName} ${lastName}`.trim();

        const email = userData.email || userData.studentEmailId; // <-- FIX: Check for studentEmailId
        // <-- FIX: Check for fatherMobileNo and motherMobileNo
        const phone = userData.phone || userData.contact?.primaryPhone || userData.fatherMobileNo || userData.motherMobileNo || '9999999999';

        // <-- FIX: Greatly improved address logic to read from admission form fields
        const address = {
          permanent: {
            street: userData.address || 'Address not provided',
            area: userData.locality || '',
            city: userData.cityVillageTown || 'NA',
            state: userData.state || 'NA', // <-- FIX: Reads 'state' from userData
            country: 'India',
            pincode: userData.pinCode || '560001', // <-- FIX: Reads 'pinCode' from userData
            landmark: userData.locality || ''
          },
          current: undefined,
          sameAsPermanent: true
        };

        const createdBy = userData.createdBy || null;

        // <-- FIX: Reads 'admissionToClass' from form
        const className = userData.class || userData.studentDetails?.currentClass || userData.admissionToClass || '';
        const section = userData.section || userData.studentDetails?.currentSection || '';
        // <-- FIX: Ensures 'academicYear' from form is prioritized
        const academicYear = userData.currentAcademicYear || userData.academicYear || userData.studentDetails?.academicYear || `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`;

        // Note: dateOfBirth object is already created above for password generation

        const gender = userData.gender || 'other';

        // <-- FIX: Reads from detailed fatherNameEnglish and motherNameEnglish
        const parentName = userData.fatherNameEnglish?.firstName ? `${userData.fatherNameEnglish.firstName} ${userData.fatherNameEnglish.lastName}`.trim() : (userData.fatherName || userData.guardianName || '');
        const parentPhone = userData.fatherMobileNo || userData.fatherPhone || '';
        const parentEmail = userData.fatherEmailId || userData.fatherEmail || '';
        const parentOccupation = userData.fatherOccupation || '';

        const motherName = userData.motherNameEnglish?.firstName ? `${userData.motherNameEnglish.firstName} ${userData.motherNameEnglish.lastName}`.trim() : '';

        const parentRelationship = userData.guardianRelation || '';

        // -----------------------
        // CREATE FINAL DOCUMENT
        // -----------------------
        userDocument = {
          _id: new ObjectId(),
          userId: studentId,
          schoolCode: schoolCode.toUpperCase(),
          schoolId: targetSchoolId,

          name: {
            firstName,
            middleName,
            lastName,
            displayName: name
          },

          email,
          password: hashedPassword, // Uses the (potentially overridden) hashed password
          temporaryPassword: plainPassword, // Uses the (potentially overridden) plain password
          passwordChangeRequired: true,
          role: 'student',

          contact: {
            primaryPhone: phone,
            secondaryPhone: userData.motherMobileNo || '', // <-- FIX
            whatsappNumber: phone
          },

          address, // <-- FIX: Uses new address object

          identity: {
            // <-- FIX: Reads from form field
            aadharNumber: userData.aadharKPRNo || '',
            panNumber: ''
          },

          profileImage: userData.profileImage || null, // <-- FIX
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),

          schoolAccess: {
            joinedDate: new Date(),
            assignedBy: createdBy,
            status: 'active',
            accessLevel: 'full'
          },

          auditTrail: {
            createdBy: createdBy,
            createdAt: new Date()
          },

          // studentDetails EXACT as SchoolUser()
          studentDetails: {
            studentId,
            admissionNumber: studentId,
            rollNumber: `${className}${section}${Date.now().toString().slice(-3)}`,

            academic: {
              currentClass: className,
              currentSection: section,
              academicYear: academicYear,
              admissionDate: new Date(),
              admissionClass: className,
              enrollmentNo: userData.enrollmentNo || studentId, // <-- FIX
              tcNo: userData.tcNo || '', // <-- FIX
              previousSchool: {
                name: '',
                board: '',
                lastClass: '',
                tcNumber: userData.tcNo || '', // <-- FIX
                reasonForTransfer: ''
              }
            },

            personal: {
              dateOfBirth: dateOfBirth,
              placeOfBirth: '',
              gender: gender?.toLowerCase(),
              bloodGroup: '',
              nationality: 'Indian',
              religion: userData.religion || '', // <-- FIX
              caste: userData.studentCaste || '', // <-- FIX
              category: userData.socialCategory || '', // <-- FIX
              motherTongue: userData.motherTongue || '', // <-- FIX
              studentAadhaar: userData.aadharKPRNo || '', // <-- FIX
              studentCasteCertNo: userData.studentCasteCertificateNo || '', // <-- FIX
              belongingToBPL: userData.belongingToBPL || 'No', // <-- FIX
              bplCardNo: userData.bplCardNo || '', // <-- FIX
              bhagyalakshmiBondNo: userData.bhagyalakshmiBondNo || '', // <-- FIX
              disability: userData.disability || 'Not Applicable', // <-- FIX
              isRTECandidate: userData.isRTECandidate || 'No' // <-- FIX
            },

            medical: {
              allergies: [],
              chronicConditions: []
            },

            family: {
              father: {
                name: parentName,
                phone: parentPhone,
                email: parentEmail,
                aadhaar: userData.fatherAadharNo || '', // <-- FIX
                caste: userData.fatherCaste || '', // <-- FIX
                casteCertNo: userData.fatherCasteCertificateNo || '' // <-- FIX
              },
              mother: {
                name: motherName,
                phone: userData.motherMobileNo || '', // <-- FIX
                email: userData.motherEmailId || '', // <-- FIX
                aadhaar: userData.motherAadharNo || '', // <-- FIX
                caste: userData.motherCaste || '', // <-- FIX
                casteCertNo: userData.motherCasteCertificateNo || '' // <-- FIX
              },
              guardian: {
                name: parentName
              }
            },

            transport: {
              mode: '',
              busRoute: '',
              pickupPoint: ''
            },

            financial: {
              feeCategory: '',
              concessionType: '',
              concessionPercentage: 0,
              bankDetails: {
                bankName: userData.bankName || '', // <-- FIX
                accountNumber: userData.bankAccountNo || '', // <-- FIX
                ifscCode: userData.bankIFSCCode || '', // <-- FIX
                accountHolderName: name
              }
            }
          },

          // Backward compatibility
          academicInfo: {
            class: className,
            section: section,
            rollNumber: `${className}${section}${Date.now().toString().slice(-3)}`,
            admissionNumber: studentId,
            admissionDate: new Date()
          },

          parentIds: [],

          personal: { // <-- FIX: Populating deprecated fields for compatibility
            dateOfBirth: dateOfBirth,
            gender: gender?.toLowerCase(),
            bloodGroup: '',
            nationality: 'Indian',
            religion: userData.religion || '',
            religionOther: '',
            caste: userData.studentCaste || '',
            casteOther: '',
            category: userData.socialCategory || '',
            categoryOther: '',
            motherTongue: userData.motherTongue || '',
            placeOfBirth: '',
            studentAadhaar: userData.aadharKPRNo || '',
            studentCasteCertNo: userData.studentCasteCertificateNo || '',
            belongingToBPL: userData.belongingToBPL || 'No',
            bplCardNo: userData.bplCardNo || '',
            bhagyalakshmiBondNo: userData.bhagyalakshmiBondNo || '',
            disability: userData.disability || 'Not Applicable',
            isRTECandidate: userData.isRTECandidate || 'No'
          },

          parents: {
            father: {
              name: parentName,
              nameKannada: '',
              aadhaar: userData.fatherAadharNo || '', // <-- FIX
              caste: userData.fatherCaste || '', // <-- FIX
              casteOther: '',
              casteCertNo: userData.fatherCasteCertificateNo || '', // <-- FIX
              occupation: parentOccupation,
              qualification: '',
              phone: parentPhone,
              email: parentEmail
            },
            mother: {
              name: motherName,
              nameKannada: '',
              aadhaar: userData.motherAadharNo || '', // <-- FIX
              caste: userData.motherCaste || '', // <-- FIX
              casteOther: '',
              casteCertNo: userData.motherCasteCertificateNo || '', // <-- FIX
              occupation: '',
              qualification: '',
              phone: userData.motherMobileNo || '', // <-- FIX
              email: userData.motherEmailId || '' // <-- FIX
            },
            guardian: {
              name: parentName,
              relationship: parentRelationship,
              phone: parentPhone,
              email: parentEmail
            }
          },

          banking: { // <-- FIX: Populating deprecated fields for compatibility
            bankName: userData.bankName || '',
            accountNumber: userData.bankAccountNo || '',
            ifscCode: userData.bankIFSCCode || '',
            accountHolderName: name
          }
        };
      } else {
        // Handle other roles (admin, teacher, parent) with basic structure
        // They will use the default random password generated at the start
        throw new Error(`Role ${userData.role} not yet implemented in userGenerator`);
      }

      // Determine collection based on role
      const collectionMap = {
        'admin': 'admins',
        'teacher': 'teachers',
        'student': 'students',
        'parent': 'parents'
      };

      const collectionName = collectionMap[userData.role.toLowerCase()];
      if (!collectionName) {
        throw new Error(`Invalid role: ${userData.role}`);
      }

      const collection = connection.collection(collectionName);

      // Insert user
      const result = await collection.insertOne(userDocument);

      console.log(`👤 Created ${userData.role} user: ${userId} (${userData.email})`);

      return {
        success: true,
        user: {
          _id: result.insertedId,
          userId,
          email: userData.email,
          role: userData.role,
          name: userDocument.name,
          schoolCode
        },
        credentials: {
          userId,
          email: userData.email,
          password: plainPassword, // This will be the DOB password for students
          loginUrl: `/login/${schoolCode.toLowerCase()}`
        }
      };

    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Reset user password
   */
  static async resetUserPassword(schoolCode, userId) {
    try {
      const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);

      // Find user in appropriate collection
      const collections = ['admins', 'teachers', 'students', 'parents'];
      let user = null;
      let userCollection = null;

      for (const collectionName of collections) {
        const collection = connection.collection(collectionName);

        // Build query - only use ObjectId if userId is a valid ObjectId format
        const query = { userId: userId };

        // Check if userId is a valid ObjectId format (24 character hex string)
        if (/^[0-9a-fA-F]{24}$/.test(userId)) {
          query.$or = [
            { _id: new ObjectId(userId) },
            { userId: userId }
          ];
          delete query.userId;
        }

        user = await collection.findOne(query);
        if (user) {
          userCollection = collection;
          break;
        }
      }

      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Generate new password
      const newPassword = this.generateRandomPassword();
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user password
      // Build update query - only use ObjectId if userId is a valid ObjectId format
      const updateQuery = { userId: userId };

      // Check if userId is a valid ObjectId format (24 character hex string)
      if (/^[0-9a-fA-F]{24}$/.test(userId)) {
        updateQuery.$or = [
          { _id: new ObjectId(userId) },
          { userId: userId }
        ];
        delete updateQuery.userId;
      }

      await userCollection.updateOne(
        updateQuery,
        {
          $set: {
            password: hashedPassword,
            updatedAt: new Date(),
            loginAttempts: 0 // Reset login attempts
          }
        }
      );

      console.log(`🔑 Password reset for user: ${userId}`);

      return {
        success: true,
        credentials: {
          userId,
          email: user.email,
          password: newPassword,
          message: 'Password has been reset successfully'
        }
      };

    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  /**
   * Get user by ID or email from school database
   */
  static async getUserByIdOrEmail(schoolCode, identifier, includePassword = false) {
    try {
      const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
      const collections = ['admins', 'teachers', 'students', 'parents'];
      const raw = (identifier || '').toString().trim();
      const isObjectId = ObjectId.isValid(raw);
      const looksLikeEmail = raw.includes('@');
      const emailRegex = looksLikeEmail ? new RegExp(`^${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : null;

      for (const collectionName of collections) {
        const collection = connection.collection(collectionName);
        const orQueries = [];
        if (isObjectId) orQueries.push({ _id: new ObjectId(raw) });
        if (raw) orQueries.push({ userId: raw });
        if (looksLikeEmail) orQueries.push({ email: emailRegex }); // case-insensitive exact match
        const user = await collection.findOne(orQueries.length ? { $or: orQueries } : {});

        if (user) {
          // Determine role from collection name
          const roleMap = {
            'admins': 'admin',
            'teachers': 'teacher',
            'students': 'student',
            'parents': 'parent'
          };
          const role = roleMap[collectionName] || user.role;

          // Optionally remove password from return object
          if (includePassword) {
            const result = {
              ...user,
              collection: collectionName,
              role: role, // Explicitly set role
              userId: user.userId // Explicitly preserve userId
            };
            return result;
          } else {
            const { password, ...userWithoutPassword } = user;
            const result = {
              ...userWithoutPassword,
              collection: collectionName,
              role: role, // Explicitly set role
              userId: user.userId // Explicitly preserve userId
            };
            return result;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  /**
   * Get all users from a school by role
   */
  static async getUsersByRole(schoolCode, role) {
    try {
      console.log(`🔍 Getting ${role}s from school_${schoolCode.toLowerCase()}`);

      const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
      const collectionMap = {
        'admin': 'admins',
        'teacher': 'teachers',
        'student': 'students',
        'parent': 'parents'
      };

      const collectionName = collectionMap[role.toLowerCase()];
      if (!collectionName) {
        throw new Error(`Invalid role: ${role}`);
      }

      console.log(`📂 Accessing collection: ${collectionName} in school_${schoolCode.toLowerCase()}`);

      const collection = connection.collection(collectionName);
      const users = await collection.find(
        { _placeholder: { $ne: true } },
        { projection: { password: 0 } } // Exclude hashed password only, keep temporaryPassword
      ).toArray();

      console.log(`✅ Found ${users.length} ${role}s in ${collectionName} collection`);
      console.log(`🔑 Sample user fields:`, users.length > 0 ? Object.keys(users[0]) : 'No users');

      return users;
    } catch (error) {
      console.error(`❌ Error getting ${role}s from school_${schoolCode.toLowerCase()}:`, error);
      throw error;
    }
  }

  /**
   * Update user information
   * THIS FUNCTION CONTAINS LINT FIXES
   */
  static async updateUser(schoolCode, userId, updateData) {
    try {
      const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
      const collections = ['admins', 'teachers', 'students', 'parents'];

      let userCollection = null;
      for (const collectionName of collections) {
        const collection = connection.collection(collectionName);
        // Try both _id and userId to cover different scenarios
        // Only try ObjectId if userId looks like a valid ObjectId (24 hex chars)
        const query = { userId: userId };
        if (userId.match(/^[0-9a-fA-F]{24}$/)) {
          query.$or = [
            { _id: new ObjectId(userId) },
            { userId: userId }
          ];
          delete query.userId;
        }

        const user = await collection.findOne(query);
        if (user) {
          userCollection = collection;
          break;
        }
      }

      if (!userCollection) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Get the user to determine role
      const updateQuery = { userId: userId };
      if (userId.match(/^[0-9a-fA-F]{24}$/)) {
        updateQuery.$or = [
          { _id: new ObjectId(userId) },
          { userId: userId }
        ];
        delete updateQuery.userId;
      }

      const user = await userCollection.findOne(updateQuery);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Build proper update object with nested structures
      const updateFields = {};

      // Handle password update separately
      if (updateData.password && updateData.password.trim()) {
        updateFields.password = await this.hashPassword(updateData.password);
      }

      // Update basic name fields
      if (updateData.firstName || updateData.lastName || updateData.middleName) {
        if (updateData.firstName) updateFields['name.firstName'] = updateData.firstName.trim();
        if (updateData.lastName) updateFields['name.lastName'] = updateData.lastName.trim();
        if (updateData.middleName) updateFields['name.middleName'] = updateData.middleName.trim();
        const displayName = `${updateData.firstName || user.name?.firstName || ''} ${updateData.lastName || user.name?.lastName || ''}`.trim();
        if (displayName) updateFields['name.displayName'] = displayName;
      }

      // Update email
      if (updateData.email) updateFields.email = updateData.email.trim().toLowerCase();

      // Update contact fields
      if (updateData.primaryPhone !== undefined) updateFields['contact.primaryPhone'] = updateData.primaryPhone;
      if (updateData.secondaryPhone !== undefined) updateFields['contact.secondaryPhone'] = updateData.secondaryPhone;
      if (updateData.whatsappNumber !== undefined) updateFields['contact.whatsappNumber'] = updateData.whatsappNumber;

      // Update address fields - handle conversion from string to object if needed
      const hasAddressUpdates = updateData.permanentStreet !== undefined || updateData.permanentArea !== undefined ||
        updateData.permanentCity !== undefined || updateData.permanentState !== undefined ||
        updateData.permanentPincode !== undefined || updateData.permanentCountry !== undefined ||
        updateData.permanentLandmark !== undefined || updateData.sameAsPermanent !== undefined;

      if (hasAddressUpdates) {
        // Check if current address is a string - if so, convert to object first
        if (typeof user.address === 'string') {
          // Convert string address to object structure
          updateFields['address'] = {
            permanent: {
              street: updateData.permanentStreet || user.address || '',
              area: updateData.permanentArea || '',
              city: updateData.permanentCity || '',
              state: updateData.permanentState || '',
              country: updateData.permanentCountry || 'India',
              pincode: updateData.permanentPincode || '',
              landmark: updateData.permanentLandmark || ''
            },
            current: null,
            sameAsPermanent: updateData.sameAsPermanent !== false
          };
        } else {
          // Address is already an object, update nested fields
          if (updateData.permanentStreet !== undefined) updateFields['address.permanent.street'] = updateData.permanentStreet;
          if (updateData.permanentArea !== undefined) updateFields['address.permanent.area'] = updateData.permanentArea;
          if (updateData.permanentCity !== undefined) updateFields['address.permanent.city'] = updateData.permanentCity;
          if (updateData.permanentState !== undefined) updateFields['address.permanent.state'] = updateData.permanentState;
          if (updateData.permanentPincode !== undefined) updateFields['address.permanent.pincode'] = updateData.permanentPincode;
          if (updateData.permanentCountry !== undefined) updateFields['address.permanent.country'] = updateData.permanentCountry;
          if (updateData.permanentLandmark !== undefined) updateFields['address.permanent.landmark'] = updateData.permanentLandmark;
          if (updateData.sameAsPermanent !== undefined) updateFields['address.sameAsPermanent'] = updateData.sameAsPermanent;
        }
      }

      // Update role-specific fields
      const rolePrefix = `${user.role}Details`;
      if (user.role === 'student') {
        // Academic fields
        if (updateData.currentClass !== undefined || updateData.class !== undefined) updateFields[`${rolePrefix}.currentClass`] = updateData.currentClass || updateData.class;
        if (updateData.currentSection !== undefined || updateData.section !== undefined) updateFields[`${rolePrefix}.currentSection`] = updateData.currentSection || updateData.section;
        if (updateData.rollNumber !== undefined) updateFields[`${rolePrefix}.rollNumber`] = updateData.rollNumber;
        if (updateData.admissionNumber !== undefined) updateFields[`${rolePrefix}.admissionNumber`] = updateData.admissionNumber;
        if (updateData.admissionDate !== undefined) updateFields[`${rolePrefix}.admissionDate`] = updateData.admissionDate ? new Date(updateData.admissionDate) : null;
        if (updateData.dateOfBirth !== undefined) updateFields[`${rolePrefix}.dateOfBirth`] = updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : null;
        if (updateData.gender !== undefined) updateFields[`${rolePrefix}.gender`] = updateData.gender;

        // Family fields - only update if non-empty
        if (updateData.fatherName !== undefined && updateData.fatherName !== '') updateFields[`${rolePrefix}.fatherName`] = updateData.fatherName;
        if (updateData.fatherPhone !== undefined && updateData.fatherPhone !== '') updateFields[`${rolePrefix}.fatherPhone`] = updateData.fatherPhone;
        if (updateData.fatherEmail !== undefined && updateData.fatherEmail !== '') updateFields[`${rolePrefix}.fatherEmail`] = updateData.fatherEmail;
        if (updateData.fatherOccupation !== undefined && updateData.fatherOccupation !== '') updateFields[`${rolePrefix}.fatherOccupation`] = updateData.fatherOccupation;
        if (updateData.motherName !== undefined && updateData.motherName !== '') updateFields[`${rolePrefix}.motherName`] = updateData.motherName;
        // <-- LINT FIX: 'roleP refix' to 'rolePrefix'
        if (updateData.motherPhone !== undefined && updateData.motherPhone !== '') updateFields[`${rolePrefix}.motherPhone`] = updateData.motherPhone;
        if (updateData.motherEmail !== undefined && updateData.motherEmail !== '') updateFields[`${rolePrefix}.motherEmail`] = updateData.motherEmail;
        if (updateData.motherOccupation !== undefined && updateData.motherOccupation !== '') updateFields[`${rolePrefix}.motherOccupation`] = updateData.motherOccupation;
        if (updateData.guardianName !== undefined && updateData.guardianName !== '') updateFields[`${rolePrefix}.guardianName`] = updateData.guardianName;
        const guardianRel = updateData.guardianRelation || updateData.guardianRelationship;
        // <-- LINT FIX: 'roleD etails' to 'rolePrefix'
        if (guardianRel !== undefined && guardianRel !== '') updateFields[`${rolePrefix}.guardianRelationship`] = guardianRel;

        // Personal fields
        if (updateData.bloodGroup !== undefined) updateFields[`${rolePrefix}.bloodGroup`] = updateData.bloodGroup;
        if (updateData.nationality !== undefined) updateFields[`${rolePrefix}.nationality`] = updateData.nationality;
        if (updateData.religion !== undefined) updateFields[`${rolePrefix}.religion`] = updateData.religion;
        if (updateData.caste !== undefined || updateData.studentCaste !== undefined) updateFields[`${rolePrefix}.caste`] = updateData.caste || updateData.studentCaste;
        if (updateData.category !== undefined || updateData.socialCategory !== undefined) updateFields[`${rolePrefix}.category`] = updateData.category || updateData.socialCategory;

        // Banking fields
        if (updateData.bankName !== undefined) updateFields[`${rolePrefix}.bankName`] = updateData.bankName;
        if (updateData.bankAccountNo !== undefined || updateData.bankAccountNumber !== undefined) updateFields[`${rolePrefix}.bankAccountNo`] = updateData.bankAccountNo || updateData.bankAccountNumber;
        if (updateData.ifscCode !== undefined || updateData.bankIFSC !== undefined) updateFields[`${rolePrefix}.bankIFSC`] = updateData.ifscCode || updateData.bankIFSC;

        // Medical fields
        if (updateData.medicalConditions !== undefined) updateFields[`${rolePrefix}.medicalConditions`] = updateData.medicalConditions;
        if (updateData.allergies !== undefined) updateFields[`${rolePrefix}.allergies`] = updateData.allergies;
        if (updateData.specialNeeds !== undefined) updateFields[`${rolePrefix}.specialNeeds`] = updateData.specialNeeds;
        if (updateData.disability !== undefined) updateFields[`${rolePrefix}.disability`] = updateData.disability;
        if (updateData.isRTECandidate !== undefined) updateFields[`${rolePrefix}.isRTECandidate`] = updateData.isRTECandidate;

        // Mother tongue
        if (updateData.motherTongue !== undefined) updateFields[`${rolePrefix}.motherTongue`] = updateData.motherTongue;
        // <-- LINT FIX: 'motherTongfOther' to 'motherTongueOther'
        if (updateData.motherTongueOther !== undefined) updateFields[`${rolePrefix}.motherTongueOther`] = updateData.motherTongueOther;

        // Previous school
        if (updateData.previousSchoolName !== undefined) updateFields[`${rolePrefix}.previousSchoolName`] = updateData.previousSchoolName;
        if (updateData.tcNumber !== undefined) updateFields[`${rolePrefix}.tcNumber`] = updateData.tcNumber;
      } else if (user.role === 'teacher') {
        if (updateData.qualification !== undefined) updateFields[`${rolePrefix}.qualification`] = updateData.qualification;
        // <-- LINT FIX: 'rolePriority' to 'rolePrefix'
        if (updateData.experience !== undefined) updateFields[`${rolePrefix}.experience`] = updateData.experience;
        if (updateData.subjects !== undefined && Array.isArray(updateData.subjects)) {
          updateFields[`${rolePrefix}.subjects`] = updateData.subjects.map(s => String(s).trim()).filter(Boolean);
        }
      }

      updateFields.updatedAt = new Date();

      console.log(`📝 Updating user ${userId} with fields:`, Object.keys(updateFields));

      const result = await userCollection.updateOne(
        updateQuery,
        { $set: updateFields }
      );

      // <-- LINT FIX: Do not throw an error if no fields were changed.
      if (result.modifiedCount === 0) {
        console.log(`📝 No fields were modified for user: ${userId}`);
        return { success: true, message: 'User updated successfully (no fields changed)' };
      }

      console.log(`📝 Updated user: ${userId}`);
      return { success: true, message: 'User updated successfully' };

    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
}

module.exports = UserGenerator;