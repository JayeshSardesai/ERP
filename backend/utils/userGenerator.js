/**
   * Create a new user in the appropriate school collection
   */
  static async createUser(schoolCode, userData) {
  try {
    const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);

    // Generate user ID and password
    const userId = await this.generateUserId(schoolCode, userData.role);
    const plainPassword = this.generateRandomPassword();
    const hashedPassword = await this.hashPassword(plainPassword);

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

      // Normalize name
      // <-- FIX: Reads from the nested studentNameEnglish object
      const firstName = userData.studentNameEnglish?.firstName || userData.firstName || 'Student';
      const lastName = userData.studentNameEnglish?.lastName || userData.lastName || 'User';
      const middleName = userData.studentNameEnglish?.middleName || userData.middleName || '';
      const name = `${firstName} ${lastName}`.trim();

      const email = userData.email || userData.studentEmailId; // <-- FIX: Check for studentEmailId
      const password = plainPassword;
      // <-- FIX: Check for fatherMobileNo and motherMobileNo
      const phone = userData.phone || userData.contact?.primaryPhone || userData.fatherMobileNo || userData.motherMobileNo || '9999999999';

      // <-- FIX: Greatly improved address logic to read from admission form fields
      const address = {
        permanent: {
          street: userData.address || 'Address not provided',
          area: userData.locality || '',
          city: userData.cityVillageTown || 'NA',
          state: userData.state || 'NA', // <-- Assumes 'state' is passed in userData
          country: 'India',
          pincode: userData.pinCode || '560001',
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
      const academicYear = userData.academicYear || userData.studentDetails?.academicYear || `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`;
      const dateOfBirth = userData.dateOfBirth ? new Date(userData.dateOfBirth.split('/').reverse().join('-')) : new Date(); // <-- FIX: Handles DD/MM/YYYY
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
        password: hashedPassword,
        temporaryPassword: password,
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
        password: plainPassword,
        loginUrl: `/login/${schoolCode.toLowerCase()}`
      }
    };

  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}