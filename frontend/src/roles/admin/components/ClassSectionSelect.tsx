import React, { useState, useEffect } from 'react';
import { ChevronDown, AlertCircle, RefreshCw } from 'lucide-react';
import { classesAPI } from '../../../services/api';
import { useAuth } from '../../../auth/AuthContext';

interface ClassSectionSelectProps {
  schoolId?: string; // Optional - if omitted use auth.user.schoolId
  valueClass: string;
  valueSection: string;
  onClassChange: (classValue: string) => void;
  onSectionChange: (sectionValue: string) => void;
  includeAllOptions?: boolean; // Default true
  disabled?: boolean;
  showSection?: boolean; // Default true. When false, hide section UI and force 'ALL'
}

interface ClassData {
  classId: string;
  className: string;
  sections: Array<{
    sectionId: string;
    sectionName: string;
  }>;
}

const ClassSectionSelect: React.FC<ClassSectionSelectProps> = ({
  schoolId,
  valueClass,
  valueSection,
  onClassChange,
  onSectionChange,
  includeAllOptions = true,
  disabled = false,
  showSection = true
}) => {

  const { user } = useAuth();
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);
  
  // Data state
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the school ID to use
  const targetSchoolId = schoolId || user?.schoolId;

  // Fetch classes and sections from API
  const fetchClasses = async () => {
    if (!targetSchoolId) {
      setError('No school ID available');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await classesAPI.getSchoolClasses(targetSchoolId);
      
      if (response.data?.success && response.data?.data) {
        const payload = response.data.data as ClassData[];
        setClasses(payload);
        
        // If current selections are invalid, reset them
        const validClasses = payload.map((c: ClassData) => c.className);
        if (valueClass !== 'ALL' && !validClasses.includes(valueClass)) {
          onClassChange('ALL');
          onSectionChange('ALL');
        }
      } else {
        setClasses([]);
      }
      
    } catch (error: any) {
      console.error('Error fetching classes:', error);
      setError('Failed to load classes and sections');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch classes on mount and when schoolId changes
  useEffect(() => {
    fetchClasses();
  }, [targetSchoolId]);

  // Handle class change
  const handleClassChange = (className: string) => {
    onClassChange(className);
    
    // Reset section when class changes
    if (className === 'ALL') {
      onSectionChange('ALL');
    } else {
      // Find the selected class and its sections
      const selectedClass = classes.find(c => c.className === className);
      if (selectedClass) {
        const validSections = selectedClass.sections.map(s => s.sectionName);
        if (valueSection !== 'ALL' && !validSections.includes(valueSection)) {
          onSectionChange('ALL');
        }
      } else {
        onSectionChange('ALL');
      }
    }
    setIsClassDropdownOpen(false);
  };

  // Handle section change
  const handleSectionChange = (sectionName: string) => {
    onSectionChange(sectionName);
    setIsSectionDropdownOpen(false);
  };

  // Get available sections for the selected class
  const getAvailableSections = () => {
    if (valueClass === 'ALL') {
      return [{ sectionId: 'ALL', sectionName: 'ALL' }];
    }
    
    const selectedClass = classes.find(c => c.className === valueClass);
    return selectedClass ? selectedClass.sections : [];
  };

  // Render loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-600 mr-2" />
          <span className="text-sm text-gray-600">Loading classes...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-2 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span className="text-sm">{error}</span>
          <button
            onClick={fetchClasses}
            className="ml-auto text-red-600 hover:text-red-800 underline text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render no data state
  if (classes.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span className="text-sm">
            No classes defined for this school. Ask Super Admin to add classes/sections.
          </span>
          <button
            onClick={fetchClasses}
            className="ml-auto text-yellow-600 hover:text-yellow-800 underline text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 ${showSection ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-4`}>
      {/* Class Selection */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Class
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
            disabled={disabled}
            className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <span className="block truncate">
              {valueClass === 'ALL' ? 'All Classes' : `Class ${valueClass}`}
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </span>
          </button>

          {isClassDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
              {includeAllOptions && (
                <div
                  className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
                  onClick={() => handleClassChange('ALL')}
                >
                  <span className="font-normal block truncate">All Classes</span>
                </div>
              )}
              {classes.map((classData) => (
                <div
                  key={classData.classId}
                  className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
                  onClick={() => handleClassChange(classData.className)}
                >
                  <span className="font-normal block truncate">Class {classData.className}</span>
                  <span className="text-xs text-gray-500 block">
                    {classData.sections.length} section{classData.sections.length !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section Selection (optional) */}
      {showSection ? (
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Section
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSectionDropdownOpen(!isSectionDropdownOpen)}
              disabled={disabled || valueClass === 'ALL'}
              className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <span className="block truncate">
                {valueSection === 'ALL' ? 'All Sections' : `Section ${valueSection}`}
              </span>
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </span>
            </button>

            {isSectionDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                {includeAllOptions && (
                  <div
                    className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
                    onClick={() => handleSectionChange('ALL')}
                  >
                    <span className="font-normal block truncate">All Sections</span>
                  </div>
                )}
                {getAvailableSections().map((section) => (
                  <div
                    key={section.sectionId}
                    className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
                    onClick={() => handleSectionChange(section.sectionName)}
                  >
                    <span className="font-normal block truncate">Section {section.sectionName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ClassSectionSelect;