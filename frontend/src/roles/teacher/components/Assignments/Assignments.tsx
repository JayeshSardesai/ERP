import React, { useState } from 'react';
import { BookOpen, Eye, PlusCircle } from 'lucide-react';
import ViewAssignments from './ViewAssignments';
import AddAssignments from './AddAssignments';

interface AssignmentsProps {
  onNavigate?: (page: string) => void;
}

const Assignments: React.FC<AssignmentsProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'view' | 'add'>('view');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
          <BookOpen className="h-6 w-6 text-purple-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Assignments Management</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('view')}
              className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                activeTab === 'view'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Eye className="h-5 w-5" />
              <span className="font-medium">View Assignments</span>
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                activeTab === 'add'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <PlusCircle className="h-5 w-5" />
              <span className="font-medium">Add Assignment</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'view' ? <ViewAssignments /> : <AddAssignments />}
        </div>
      </div>
    </div>
  );
};

export default Assignments;
