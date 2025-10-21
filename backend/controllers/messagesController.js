const Message = require('../models/Message');
const User = require('../models/User');
const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');

// Send message to students by class/section
exports.sendMessage = async (req, res) => {
  try {
    console.log('📨 Sending message:', req.body);
    
    // Validate required fields
    const { title, body, class: targetClass, section: targetSection, schoolId } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Title and body are required'
      });
    }

    // Verify school ownership
    const userSchoolId = req.user.schoolId;
    if (!userSchoolId) {
      return res.status(400).json({
        success: false,
        message: 'User school ID not found'
      });
    }

    // For super admin, allow any schoolId; for admin, must match their school
    if (req.user.role === 'admin' && userSchoolId.toString() !== schoolId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot send messages to other schools'
      });
    }
    
    // Get school connection for student queries
    const schoolCode = req.user.schoolCode;
    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found in user profile'
      });
    }
    
    const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = connection.db;
    
    // Build student query using canonical class/section fields
    const studentQuery = { 
      role: 'student',
      _placeholder: { $ne: true } // Exclude placeholder documents
    };
    
    if (targetClass && targetClass !== 'ALL') {
      studentQuery.class = targetClass;
    }
    
    if (targetSection && targetSection !== 'ALL') {
      studentQuery.section = targetSection;
    }
    
    console.log('🔍 Student query:', studentQuery);
    
    // Find matching students
    const studentsCollection = db.collection('students');
    const students = await studentsCollection.find(studentQuery).toArray();
    
    console.log(`👥 Found ${students.length} students matching criteria`);
    
    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No students found matching the selected criteria'
      });
    }
    
    // Create message document
    const messageData = {
      schoolId: userSchoolId,
      createdBy: req.user._id,
      subject: title,
      content: body,
      messageType: 'general',
      priority: 'normal',
      status: 'sent',
      sentAt: new Date(),
      totalRecipients: students.length,
      target: {
        class: targetClass || 'ALL',
        section: targetSection || 'ALL'
      },
      sentTo: students.map(student => student._id),
      recipients: students.map(student => ({
        user: student._id,
        readAt: null
      })),
      readBy: new Map() // Initialize empty readBy map
    };
    
    // Save message to main database
    const message = new Message(messageData);
    await message.save();
    
    console.log(`✅ Message sent successfully to ${students.length} students`);
    
    // Dispatch background job for notifications (FCM, email, etc.)
    // This would be implemented in a notification service
    // For now, we'll just log it
    console.log('📱 Dispatching background notification job...');
    
    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        messageId: message._id,
        sentCount: students.length,
        recipients: students.map(s => ({
          id: s._id,
          name: s.name?.displayName || `${s.name?.firstName} ${s.name?.lastName}`,
          class: s.class,
          section: s.section
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

// Preview message recipients count
exports.previewMessage = async (req, res) => {
  try {
    console.log('🔍 Previewing message recipients:', req.body);
    
    const { class: targetClass, section: targetSection, schoolId } = req.body;
    
    // Verify school ownership
    const userSchoolId = req.user.schoolId;
    if (req.user.role === 'admin' && userSchoolId.toString() !== schoolId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot preview messages for other schools'
      });
    }
    
    // Get school connection for student queries
    const schoolCode = req.user.schoolCode;
    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found in user profile'
      });
    }
    
    const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = connection.db;
    
    // Build student query using canonical class/section fields
    const studentQuery = { 
      role: 'student',
      _placeholder: { $ne: true } // Exclude placeholder documents
    };
    
    if (targetClass && targetClass !== 'ALL') {
      studentQuery.class = targetClass;
    }
    
    if (targetSection && targetSection !== 'ALL') {
      studentQuery.section = targetSection;
    }
    
    // Count matching students
    const studentsCollection = db.collection('students');
    const studentCount = await studentsCollection.countDocuments(studentQuery);
    
    // Get sample students for preview (limit to 10)
    const sampleStudents = await studentsCollection.find(studentQuery)
      .limit(10)
      .project({ 
        _id: 1, 
        'name.firstName': 1, 
        'name.lastName': 1, 
        'name.displayName': 1,
        class: 1, 
        section: 1 
      })
      .toArray();
    
    console.log(`👥 Found ${studentCount} students matching criteria`);
    
    res.json({
      success: true,
      data: {
        estimatedRecipients: studentCount,
        targetClass: targetClass || 'ALL',
        targetSection: targetSection || 'ALL',
        sampleRecipients: sampleStudents.map(s => ({
          id: s._id,
          name: s.name?.displayName || `${s.name?.firstName} ${s.name?.lastName}`,
          class: s.class,
          section: s.section
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Error previewing message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview message',
      error: error.message
    });
  }
};

// Get messages with filtering
exports.getMessages = async (req, res) => {
  try {
    console.log('📋 Fetching messages with filters:', req.query);
    
    const { 
      schoolId, 
      class: targetClass, 
      section: targetSection, 
      page = 1, 
      limit = 20,
      status = 'sent'
    } = req.query;
    
    // Build query
    const query = {
      schoolId: req.user.schoolId,
      status: status
    };
    
    // Filter by target class/section if specified
    if (targetClass && targetClass !== 'ALL') {
      query['target.class'] = targetClass;
    }
    
    if (targetSection && targetSection !== 'ALL') {
      query['target.section'] = targetSection;
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with pagination
    const messages = await Message.find(query)
      .populate('sender', 'name email')
      .populate('createdBy', 'name email')
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalMessages = await Message.countDocuments(query);
    
    // Format response
    const formattedMessages = messages.map(message => ({
      id: message._id,
      title: message.subject,
      body: message.content,
      target: `${message.target?.class || 'ALL'} - ${message.target?.section || 'ALL'}`,
      sentAt: message.sentAt,
      recipientsCount: message.totalRecipients,
      readCount: message.readCount,
      status: message.status,
      sender: message.createdBy?.name?.displayName || 'Unknown',
      messageType: message.messageType,
      priority: message.priority
    }));
    
    res.json({
      success: true,
      data: {
        messages: formattedMessages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalMessages,
          pages: Math.ceil(totalMessages / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
};

// Get message details
exports.getMessageDetails = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId)
      .populate('sender', 'name email')
      .populate('createdBy', 'name email')
      .populate('recipients.user', 'name class section rollNumber');
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Check if user has access to this message
    if (message.schoolId.toString() !== req.user.schoolId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: message._id,
        title: message.subject,
        body: message.content,
        target: `${message.recipientGroups[0]?.value || 'ALL'} - ${message.recipientGroups[1]?.value || 'ALL'}`,
        sentAt: message.sentAt,
        recipientsCount: message.totalRecipients,
        readCount: message.readCount,
        status: message.status,
        sender: message.sender?.name?.displayName || 'Unknown',
        messageType: message.messageType,
        priority: message.priority,
        recipients: message.recipients.map(recipient => ({
          id: recipient.user._id,
          name: recipient.user.name?.displayName || `${recipient.user.name?.firstName} ${recipient.user.name?.lastName}`,
          class: recipient.user.class,
          section: recipient.user.section,
          rollNumber: recipient.user.rollNumber,
          readAt: recipient.readAt
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching message details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch message details',
      error: error.message
    });
  }
};

// Get message statistics
exports.getMessageStats = async (req, res) => {
  try {
    const { schoolId } = req.query;
    
    const stats = await Message.aggregate([
      { $match: { schoolId: req.user.schoolId } },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          totalRecipients: { $sum: '$totalRecipients' },
          totalRead: { $sum: '$readCount' },
          avgReadRate: {
            $avg: {
              $cond: [
                { $gt: ['$totalRecipients', 0] },
                { $divide: ['$readCount', '$totalRecipients'] },
                0
              ]
            }
          }
        }
      }
    ]);
    
    const result = stats[0] || {
      totalMessages: 0,
      totalRecipients: 0,
      totalRead: 0,
      avgReadRate: 0
    };
    
    res.json({
      success: true,
      data: {
        totalMessages: result.totalMessages,
        totalRecipients: result.totalRecipients,
        totalRead: result.totalRead,
        avgReadRate: Math.round(result.avgReadRate * 100) / 100
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching message stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch message statistics',
      error: error.message
    });
  }
};
