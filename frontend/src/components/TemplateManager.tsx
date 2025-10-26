import React, { useState, useEffect } from 'react';
import { Upload, Eye, Edit, Trash2, Settings, Save, X, Plus, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext';
import api from '../services/api';
import CustomIDCardTemplate from './templates/CustomIDCardTemplate';

interface Template {
  _id: string;
  name: string;
  description: string;
  orientation: 'landscape' | 'portrait';
  side: 'front' | 'back';
  templateImage: string;
  dataFields: any;
  photoPlacement: any;
  schoolLogoPlacement: any;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

interface TemplateManagerProps {
  onTemplateSelect?: (template: Template) => void;
  selectedTemplate?: Template | null;
  showPreview?: boolean;
  onClose?: () => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({
  onTemplateSelect,
  selectedTemplate,
  showPreview = false,
  onClose
}) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    orientation: 'landscape' as 'landscape' | 'portrait',
    side: 'front' as 'front' | 'back',
    templateImage: null as File | null
  });

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/id-card-templates');
      if (response.data.success) {
        setTemplates(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a valid image file (JPEG, PNG, GIF, WebP)');
        return;
      }

      // Validate file size (20MB limit)
      if (file.size > 20 * 1024 * 1024) {
        toast.error('File size must be less than 20MB');
        return;
      }

      setFormData(prev => ({ ...prev, templateImage: file }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.templateImage) {
      toast.error('Please select a template image');
      return;
    }

    try {
      setLoading(true);
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('orientation', formData.orientation);
      formDataToSend.append('side', formData.side);
      formDataToSend.append('templateImage', formData.templateImage);

      const response = await api.post('/id-card-templates', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success('Template uploaded successfully');
        setShowUploadForm(false);
        setFormData({
          name: '',
          description: '',
          orientation: 'landscape',
          side: 'front',
          templateImage: null
        });
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error uploading template:', error);
      toast.error('Failed to upload template');
    } finally {
      setLoading(false);
    }
  };

  // Handle template deletion
  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await api.delete(`/id-card-templates/${templateId}`);
      if (response.data.success) {
        toast.success('Template deleted successfully');
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: Template) => {
    if (onTemplateSelect) {
      onTemplateSelect(template);
    }
  };

  // Handle preview
  const handlePreview = (template: Template) => {
    setPreviewTemplate(template);
    setShowPreviewModal(true);
  };

  // Sample student data for preview
  const sampleStudent = {
    id: '1',
    name: 'John Doe',
    rollNumber: 'STU001',
    sequenceId: 'STU001',
    className: '10th',
    section: 'A',
    profileImage: null,
    fatherName: 'Robert Doe',
    motherName: 'Jane Doe',
    dateOfBirth: '2005-01-15',
    bloodGroup: 'O+',
    address: '123 Main Street, City',
    phone: '+91-9876543210'
  };

  const sampleSettings = {
    schoolName: user?.schoolName || 'Sample School',
    schoolCode: user?.schoolCode || 'SCH001',
    website: 'www.school.com',
    logoUrl: '',
    headerColor: '#1f2937',
    accentColor: '#3b82f6',
    address: '123 School Street, City, State 12345',
    phone: '+91-XXXXXXXXXX',
    email: 'info@school.com'
  };

  if (showPreview) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Template Preview</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {selectedTemplate && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium">{selectedTemplate.name}</h3>
                <p className="text-gray-600">{selectedTemplate.description}</p>
              </div>

              <div className="flex justify-center">
                <CustomIDCardTemplate
                  settings={sampleSettings}
                  student={sampleStudent}
                  templateId={selectedTemplate.orientation}
                  side={selectedTemplate.side}
                  mode="preview"
                  templateImage={selectedTemplate.templateImage}
                  dataFields={selectedTemplate.dataFields}
                  photoPlacement={selectedTemplate.photoPlacement}
                  schoolLogoPlacement={selectedTemplate.schoolLogoPlacement}
                />
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => handleTemplateSelect(selectedTemplate)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Use This Template
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">ID Card Templates</h2>
        <button
          onClick={() => setShowUploadForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Upload Template
        </button>
      </div>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Upload Template</h3>
              <button
                onClick={() => setShowUploadForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Orientation
                  </label>
                  <select
                    value={formData.orientation}
                    onChange={(e) => setFormData(prev => ({ ...prev, orientation: e.target.value as 'landscape' | 'portrait' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Side
                  </label>
                  <select
                    value={formData.side}
                    onChange={(e) => setFormData(prev => ({ ...prev, side: e.target.value as 'front' | 'back' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="front">Front</option>
                    <option value="back">Back</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Image
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="template-upload"
                  />
                  <label
                    htmlFor="template-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      {formData.templateImage ? formData.templateImage.name : 'Click to upload image'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8">
          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No templates found. Upload your first template to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template._id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePreview(template)}
                    className="p-1 text-gray-500 hover:text-blue-600"
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template._id)}
                    className="p-1 text-gray-500 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Orientation:</span>
                  <span className="font-medium capitalize">{template.orientation}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Side:</span>
                  <span className="font-medium capitalize">{template.side}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${template.isDefault ? 'text-green-600' : 'text-gray-600'}`}>
                    {template.isDefault ? 'Default' : 'Active'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleTemplateSelect(template)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  Use Template
                </button>
                <button
                  onClick={() => handlePreview(template)}
                  className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
                >
                  Preview
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Template Preview</h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="text-center">
              <CustomIDCardTemplate
                settings={sampleSettings}
                student={sampleStudent}
                templateId={previewTemplate.orientation}
                side={previewTemplate.side}
                mode="preview"
                templateImage={previewTemplate.templateImage}
                dataFields={previewTemplate.dataFields}
                photoPlacement={previewTemplate.photoPlacement}
                schoolLogoPlacement={previewTemplate.schoolLogoPlacement}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManager;
