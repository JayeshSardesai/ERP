import React, { useState } from 'react';
import axios from 'axios';
import { Download, Eye, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Student {
  id: string;
  _id?: string;
  name: string;
  sequenceId?: string;
  rollNumber?: string;
  className: string;
  section: string;
  profileImage?: string;
}

interface SimpleIDCardGeneratorProps {
  selectedStudents: Student[];
  onClose: () => void;
}

const SimpleIDCardGenerator: React.FC<SimpleIDCardGeneratorProps> = ({ selectedStudents, onClose }) => {
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [includeBack, setIncludeBack] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api';

  const handleGenerate = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    try {
      setGenerating(true);
      const authData = localStorage.getItem('erp.auth');
      const token = authData ? JSON.parse(authData).token : null;
      const studentIds = selectedStudents.map(s => s._id || s.id);

      const schoolCode = localStorage.getItem('erp.schoolCode') || '';

      console.log('🎯 Generating ID cards for students:', {
        count: selectedStudents.length,
        studentIds,
        studentIdsDetailed: studentIds.map((id, idx) => ({
          index: idx,
          id: id,
          type: typeof id,
          isValidObjectId: /^[0-9a-fA-F]{24}$/.test(id),
          studentName: selectedStudents[idx]?.name
        })),
        students: selectedStudents,
        orientation,
        includeBack,
        apiUrl: `${API_BASE_URL}/id-card-templates/generate`,
        schoolCode,
        hasToken: !!token
      });

      const response = await axios.post(
        `${API_BASE_URL}/id-card-templates/generate`,
        {
          studentIds,
          orientation,
          includeBack
        },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'X-School-Code': schoolCode
          }
        }
      );

      console.log('✅ ID cards generated successfully:', response.data);

      if (response.data.success) {
        setGeneratedCards(response.data.data.generated);
        setShowResults(true);
        toast.success(response.data.message);
      }
    } catch (error: any) {
      console.error('❌ Error generating ID cards:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      const errorMessage = error.response?.data?.message || 'Failed to generate ID cards';
      const debugHint = error.response?.data?.debug?.hint;
      
      if (debugHint) {
        toast.error(`${errorMessage}\n\n${debugHint}`, { duration: 6000 });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    try {
      setDownloading(true);
      const authData = localStorage.getItem('erp.auth');
      const token = authData ? JSON.parse(authData).token : null;
      const studentIds = selectedStudents.map(s => s._id || s.id);
      const schoolCode = localStorage.getItem('erp.schoolCode') || '';

      console.log('📥 Downloading ID cards for students:', {
        count: selectedStudents.length,
        studentIds,
        orientation,
        includeBack,
        schoolCode
      });

      const response = await axios.post(
        `${API_BASE_URL}/id-card-templates/download`,
        {
          studentIds,
          orientation,
          includeBack
        },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'X-School-Code': schoolCode
          },
          responseType: 'blob'
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `IDCards_${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('ID cards downloaded successfully');
    } catch (error: any) {
      console.error('❌ Error downloading ID cards:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      const errorMessage = error.response?.data?.message || 'Failed to download ID cards';
      const debugHint = error.response?.data?.debug?.hint;
      
      if (debugHint) {
        toast.error(`${errorMessage}\n\n${debugHint}`, { duration: 6000 });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setDownloading(false);
    }
  };

  const handlePreview = (imagePath: string) => {
    setPreviewImage(`${API_BASE_URL.replace('/api', '')}${imagePath}`);
    setShowPreview(true);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Generate ID Cards ({selectedStudents.length} students)
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {!showResults ? (
              <>
                {/* Info Alert */}
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Template Setup Required</p>
                    <p>Make sure you have placed your ID card template PNG files in:</p>
                    <code className="block mt-1 bg-blue-100 px-2 py-1 rounded text-xs">
                      backend/idcard-templates/
                    </code>
                    <p className="mt-2">Required files: {orientation}-front.png{includeBack && ', ' + orientation + '-back.png'}</p>
                  </div>
                </div>

                {/* Configuration */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Orientation
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="landscape"
                          checked={orientation === 'landscape'}
                          onChange={(e) => setOrientation(e.target.value as 'landscape' | 'portrait')}
                          className="mr-2"
                        />
                        Landscape (85.6mm × 54mm)
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="portrait"
                          checked={orientation === 'portrait'}
                          onChange={(e) => setOrientation(e.target.value as 'landscape' | 'portrait')}
                          className="mr-2"
                        />
                        Portrait (54mm × 85.6mm)
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={includeBack}
                        onChange={(e) => setIncludeBack(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Include back side
                      </span>
                    </label>
                  </div>
                </div>

                {/* Selected Students */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Students:</h4>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {selectedStudents.map((student) => (
                      <div key={student._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="text-sm text-gray-900">{student.name}</span>
                        <span className="text-xs text-gray-500">
                          {student.className} - {student.section}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Eye className="w-5 h-5" />
                        Generate & Preview
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Download ZIP
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Results */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <h4 className="text-lg font-semibold text-gray-900">
                      ID Cards Generated Successfully!
                    </h4>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-green-800">
                      Generated {generatedCards.length} ID cards. You can preview them below or download all as ZIP.
                    </p>
                  </div>

                  {/* Generated Cards List */}
                  <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                    {generatedCards.map((card, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="font-medium text-gray-900">{card.studentName}</p>
                          <p className="text-sm text-gray-500">ID: {card.studentId}</p>
                        </div>
                        <div className="flex gap-2">
                          {card.frontCard && (
                            <button
                              onClick={() => handlePreview(card.frontCard)}
                              className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                            >
                              View Front
                            </button>
                          )}
                          {card.backCard && (
                            <button
                              onClick={() => handlePreview(card.backCard)}
                              className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                            >
                              View Back
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowResults(false);
                      setGeneratedCards([]);
                    }}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Generate Again
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Download All as ZIP
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">ID Card Preview</h3>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewImage(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6 flex justify-center">
              <img src={previewImage} alt="ID Card Preview" className="max-w-full h-auto" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SimpleIDCardGenerator;
