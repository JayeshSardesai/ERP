import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AccessMatrix, RolePermissions } from '../types';

const permissions = [
  { key: 'manageUsers', label: 'Manage Users' },
  { key: 'manageSchoolSettings', label: 'Manage School Settings' },
  { key: 'viewAttendance', label: 'View Attendance' },
  { key: 'viewResults', label: 'View Results' },
  { key: 'messageStudentsParents', label: 'Message Students/Parents' }
];

const roles = ['admin', 'teacher', 'student', 'parent'] as const;

export function ViewAccess() {
  const { schools, selectedSchoolId, setCurrentView, updateSchoolAccess } = useApp();
  const [accessMatrix, setAccessMatrix] = useState<AccessMatrix | null>(null);
  
  const school = schools.find(s => s.id === selectedSchoolId);

  useEffect(() => {
    if (school) {
      setAccessMatrix(school.accessMatrix);
    }
  }, [school]);

  if (!school || !accessMatrix) {
    return (
      <div className="p-6">
        <p className="text-gray-600">School not found</p>
      </div>
    );
  }

  const handlePermissionChange = (role: keyof AccessMatrix, permission: keyof RolePermissions) => {
    if (!accessMatrix) return;
    
    setAccessMatrix(prev => ({
      ...prev!,
      [role]: {
        ...prev![role],
        [permission]: !prev![role][permission]
      }
    }));
  };

  const handleSave = () => {
    if (accessMatrix && selectedSchoolId) {
      updateSchoolAccess(selectedSchoolId, accessMatrix);
      setCurrentView('dashboard');
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Access Control - {school.name}</h1>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Save className="h-5 w-5" />
            <span>Save Changes</span>
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Role-Based Access Matrix</h2>
            <p className="text-sm text-gray-600 mt-1">Configure access permissions for each role</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 min-w-[300px]">
                    Permissions
                  </th>
                  {roles.map(role => (
                    <th key={role} className="px-6 py-4 text-center text-sm font-semibold text-gray-900 min-w-[120px]">
                      <div className="flex flex-col items-center">
                        <span className="capitalize">{role}</span>
                        <span className="text-xs font-normal text-gray-500 mt-1">
                          {role === 'admin' ? 'Full Access' : 
                           role === 'teacher' ? 'Teaching Tools' :
                           role === 'student' ? 'View Only' :
                           'Parent View'}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {permissions.map((permission) => (
                  <tr key={permission.key} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">
                          {permission.label}
                        </span>
                      </div>
                    </td>
                    {roles.map(role => (
                      <td key={`${role}-${permission.key}`} className="px-6 py-4 text-center">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={accessMatrix[role][permission.key as keyof RolePermissions]}
                            onChange={() => handlePermissionChange(role, permission.key as keyof RolePermissions)}
                            className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Role Descriptions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {roles.map(role => {
            const activePermissions = permissions.filter(p => 
              accessMatrix[role][p.key as keyof RolePermissions]
            ).length;
            
            return (
              <div key={role} className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 capitalize mb-2">{role} Role</h3>
                <p className="text-xs text-gray-600 mb-2">
                  {activePermissions} of {permissions.length} permissions enabled
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(activePermissions / permissions.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}