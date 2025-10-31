import React, { useState, useEffect } from 'react';
import { Save, X, Move, Type, Image as ImageIcon, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface FieldConfig {
  x: number;
  y: number;
  fontSize: number;
  fontColor: string;
  fontFamily: string;
  enabled: boolean;
}

interface PhotoPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  enabled: boolean;
}

interface TemplateConfiguratorProps {
  template: any;
  onSave: (config: any) => void;
  onClose: () => void;
}

const TemplateConfigurator: React.FC<TemplateConfiguratorProps> = ({
  template,
  onSave,
  onClose
}) => {
  const [dataFields, setDataFields] = useState<Record<string, FieldConfig>>({
    studentName: { x: 50, y: 50, fontSize: 14, fontColor: '#000000', fontFamily: 'Arial', enabled: true },
    studentId: { x: 50, y: 70, fontSize: 12, fontColor: '#000000', fontFamily: 'Arial', enabled: true },
    className: { x: 50, y: 90, fontSize: 12, fontColor: '#000000', fontFamily: 'Arial', enabled: true },
    section: { x: 50, y: 110, fontSize: 12, fontColor: '#000000', fontFamily: 'Arial', enabled: true },
    dateOfBirth: { x: 50, y: 130, fontSize: 10, fontColor: '#000000', fontFamily: 'Arial', enabled: false },
    bloodGroup: { x: 50, y: 150, fontSize: 10, fontColor: '#000000', fontFamily: 'Arial', enabled: false },
    fatherName: { x: 50, y: 170, fontSize: 10, fontColor: '#000000', fontFamily: 'Arial', enabled: false },
    motherName: { x: 50, y: 190, fontSize: 10, fontColor: '#000000', fontFamily: 'Arial', enabled: false },
    address: { x: 50, y: 210, fontSize: 9, fontColor: '#000000', fontFamily: 'Arial', enabled: false },
    phone: { x: 50, y: 230, fontSize: 10, fontColor: '#000000', fontFamily: 'Arial', enabled: false }
  });

  const [photoPlacement, setPhotoPlacement] = useState<PhotoPlacement>({
    x: 200,
    y: 50,
    width: 80,
    height: 100,
    enabled: true
  });

  const [schoolLogoPlacement, setSchoolLogoPlacement] = useState<PhotoPlacement>({
    x: 10,
    y: 10,
    width: 40,
    height: 40,
    enabled: false
  });

  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (template?.dataFields) {
      setDataFields(template.dataFields);
    }
    if (template?.photoPlacement) {
      setPhotoPlacement(template.photoPlacement);
    }
    if (template?.schoolLogoPlacement) {
      setSchoolLogoPlacement(template.schoolLogoPlacement);
    }
  }, [template]);

  // Handle field position update
  const updateFieldPosition = (fieldName: string, x: number, y: number) => {
    setDataFields(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], x, y }
    }));
  };

  // Handle photo position update
  const updatePhotoPosition = (x: number, y: number) => {
    setPhotoPlacement(prev => ({ ...prev, x, y }));
  };

  // Handle photo size update
  const updatePhotoSize = (width: number, height: number) => {
    setPhotoPlacement(prev => ({ ...prev, width, height }));
  };

  // Handle field property update
  const updateFieldProperty = (fieldName: string, property: string, value: any) => {
    setDataFields(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], [property]: value }
    }));
  };

  // Handle mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent, fieldName: string) => {
    e.preventDefault();
    setSelectedField(fieldName);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedField) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    if (selectedField === 'photo') {
      updatePhotoPosition(
        Math.max(0, photoPlacement.x + deltaX),
        Math.max(0, photoPlacement.y + deltaY)
      );
    } else {
      updateFieldPosition(
        selectedField,
        Math.max(0, dataFields[selectedField].x + deltaX),
        Math.max(0, dataFields[selectedField].y + deltaY)
      );
    }

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setSelectedField(null);
  };

  // Handle save
  const handleSave = () => {
    const config = {
      dataFields,
      photoPlacement,
      schoolLogoPlacement
    };
    onSave(config);
    toast.success('Template configuration saved');
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
    schoolName: 'Sample School',
    schoolCode: 'SCH001',
    website: 'www.school.com',
    logoUrl: '',
    headerColor: '#1f2937',
    accentColor: '#3b82f6',
    address: '123 School Street, City, State 12345',
    phone: '+91-XXXXXXXXXX',
    email: 'info@school.com'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex">
          {/* Left Panel - Configuration */}
          <div className="w-1/3 p-6 border-r border-gray-200 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Configure Template</h3>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Data Fields Configuration */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Data Fields</h4>
                <div className="space-y-3">
                  {Object.entries(dataFields).map(([fieldName, config]) => (
                    <div key={fieldName} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium capitalize">
                          {fieldName.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        <input
                          type="checkbox"
                          checked={config.enabled}
                          onChange={(e) => updateFieldProperty(fieldName, 'enabled', e.target.checked)}
                          className="rounded"
                        />
                      </div>
                      
                      {config.enabled && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="block text-gray-600">X Position</label>
                            <input
                              type="number"
                              value={config.x}
                              onChange={(e) => updateFieldProperty(fieldName, 'x', parseInt(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-600">Y Position</label>
                            <input
                              type="number"
                              value={config.y}
                              onChange={(e) => updateFieldProperty(fieldName, 'y', parseInt(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-600">Font Size</label>
                            <input
                              type="number"
                              value={config.fontSize}
                              onChange={(e) => updateFieldProperty(fieldName, 'fontSize', parseInt(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-600">Color</label>
                            <input
                              type="color"
                              value={config.fontColor}
                              onChange={(e) => updateFieldProperty(fieldName, 'fontColor', e.target.value)}
                              className="w-full h-8 border border-gray-300 rounded"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Photo Placement Configuration */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Photo Placement</h4>
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Student Photo</label>
                    <input
                      type="checkbox"
                      checked={photoPlacement.enabled}
                      onChange={(e) => setPhotoPlacement(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="rounded"
                    />
                  </div>
                  
                  {photoPlacement.enabled && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-gray-600">X Position</label>
                        <input
                          type="number"
                          value={photoPlacement.x}
                          onChange={(e) => setPhotoPlacement(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600">Y Position</label>
                        <input
                          type="number"
                          value={photoPlacement.y}
                          onChange={(e) => setPhotoPlacement(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600">Width</label>
                        <input
                          type="number"
                          value={photoPlacement.width}
                          onChange={(e) => updatePhotoSize(parseInt(e.target.value), photoPlacement.height)}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600">Height</label>
                        <input
                          type="number"
                          value={photoPlacement.height}
                          onChange={(e) => updatePhotoSize(photoPlacement.width, parseInt(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Save className="h-4 w-4" />
                Save Configuration
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 p-6">
            <h4 className="font-medium text-gray-900 mb-4">Template Preview</h4>
            <div className="flex justify-center">
              <div
                className="relative border-2 border-gray-300"
                style={{
                  width: template?.orientation === 'landscape' ? '400px' : '250px',
                  height: template?.orientation === 'landscape' ? '250px' : '400px'
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Template Background */}
                {template?.templateImage && (
                  <img
                    src={template.templateImage}
                    alt="Template"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}

                {/* Data Fields */}
                {Object.entries(dataFields).map(([fieldName, config]) => {
                  if (!config.enabled) return null;
                  
                  const value = sampleStudent[fieldName as keyof typeof sampleStudent] || 'Sample Text';
                  
                  return (
                    <div
                      key={fieldName}
                      className="absolute cursor-move"
                      style={{
                        left: `${config.x}px`,
                        top: `${config.y}px`,
                        fontSize: `${config.fontSize}px`,
                        color: config.fontColor,
                        fontFamily: config.fontFamily,
                        fontWeight: 'bold',
                        backgroundColor: selectedField === fieldName ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                        padding: '2px 4px',
                        borderRadius: '2px',
                        zIndex: 10
                      }}
                      onMouseDown={(e) => handleMouseDown(e, fieldName)}
                    >
                      {value}
                    </div>
                  );
                })}

                {/* Student Photo */}
                {photoPlacement.enabled && (
                  <div
                    className="absolute border-2 border-blue-500 cursor-move"
                    style={{
                      left: `${photoPlacement.x}px`,
                      top: `${photoPlacement.y}px`,
                      width: `${photoPlacement.width}px`,
                      height: `${photoPlacement.height}px`,
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      zIndex: 10
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'photo')}
                  >
                    <div className="w-full h-full flex items-center justify-center text-xs text-blue-600">
                      Photo
                    </div>
                  </div>
                )}

                {/* School Logo */}
                {schoolLogoPlacement.enabled && (
                  <div
                    className="absolute border-2 border-green-500"
                    style={{
                      left: `${schoolLogoPlacement.x}px`,
                      top: `${schoolLogoPlacement.y}px`,
                      width: `${schoolLogoPlacement.width}px`,
                      height: `${schoolLogoPlacement.height}px`,
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      zIndex: 10
                    }}
                  >
                    <div className="w-full h-full flex items-center justify-center text-xs text-green-600">
                      Logo
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateConfigurator;
