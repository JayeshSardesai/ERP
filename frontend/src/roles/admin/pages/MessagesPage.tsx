import React, { useState } from 'react';
import { Send, MessageSquare, Eye, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import ClassSectionSelect from '../components/ClassSectionSelect';

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  
  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  console.log('MessagesPage render:', { user: user?.schoolCode });

  // Preview message
  const handlePreview = () => {
    if (!title.trim() || !body.trim()) {
      setError('Please fill in both title and message body');
      return;
    }
    setShowPreviewModal(true);
  };

  // Send message
  const handleSendMessage = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Message sent successfully! (This is a demo)');
      setTitle('');
      setBody('');
      setSelectedClass('ALL');
      setSelectedSection('ALL');
      setShowPreviewModal(false);
      
    } catch (error: any) {
      setError('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold text-gray-900 flex items-center">
        <MessageSquare className="mr-3 h-8 w-8 text-blue-600" /> Messages
      </h1>

      {/* Alerts */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Success!</strong>
          <span className="block sm:inline"> {success}</span>
        </div>
      )}

      {/* Send New Message Section */}
      <div className="border-b pb-4 mb-4">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Send New Message</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
          <div className="col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              id="title"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter message title"
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="body" className="block text-sm font-medium text-gray-700">
              Message Body
            </label>
            <textarea
              id="body"
              rows={5}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message here..."
            ></textarea>
          </div>
          <ClassSectionSelect
            schoolId={user?.schoolId}
            valueClass={selectedClass}
            valueSection={selectedSection}
            onClassChange={setSelectedClass}
            onSectionChange={setSelectedSection}
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={handlePreview}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Eye className="h-5 w-5 mr-2" /> Preview
          </button>
          <button
            onClick={handleSendMessage}
            disabled={loading || !title || !body}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors`}
          >
            {loading ? 'Sending...' : <><Send className="h-5 w-5 mr-2" />Send Message</>}
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative p-8 border w-full max-w-md md:max-w-lg lg:max-w-xl shadow-lg rounded-md bg-white">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Message Preview</h3>
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700">Title:</p>
              <p className="text-gray-900 font-semibold">{title}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700">Message Body:</p>
              <p className="text-gray-800 whitespace-pre-wrap">{body}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700">Target Audience:</p>
              <p className="text-gray-800">
                {selectedClass === 'ALL' ? 'All Classes' : `Class ${selectedClass}`}
                {selectedSection !== 'ALL' && ` - Section ${selectedSection}`}
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={loading}
                className={`px-4 py-2 text-white rounded-md ${
                  loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                } transition-colors`}
              >
                {loading ? 'Sending...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sent Messages List */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Sent Messages</h2>
        <div className="text-center py-8 text-gray-500">
          No messages sent yet. This is a demo version.
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
