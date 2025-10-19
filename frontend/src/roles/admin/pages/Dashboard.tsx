import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Users, UserCheck, BookOpen, TrendingUp, Calendar, Clock, AlertCircle, Building, Phone, Mail, MapPin, RefreshCw, Bug, LogOut } from 'lucide-react';
import { schoolAPI } from '../../../services/api';
import { schoolUserAPI } from '../../../api/schoolUsers';
import { useAuth } from '../../../auth/AuthContext';

interface School {
  _id: string;
  name: string;
  code: string;
  logoUrl?: string;
  principalName?: string;
  principalEmail?: string;
  mobile?: string;
  address?: {
    street?: string;
    area?: string;
    city?: string;
    district?: string;
    taluka?: string;
    state?: string;
    stateId?: number;
    districtId?: number;
    talukaId?: number;
    country?: string;
    zipCode?: string;
    pinCode?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branch?: string;
    accountHolderName?: string;
  };
  settings?: {
    academicYear?: {
      startDate?: Date;
      endDate?: Date;
      currentYear?: string;
    };
    classes?: string[];
    sections?: string[];
    subjects?: string[];
    workingDays?: string[];
    workingHours?: {
      start?: string;
      end?: string;
    };
    holidays?: Array<{
      date?: Date;
      description?: string;
    }>;
  };
  stats?: {
    totalStudents: number;
    totalTeachers: number;
    totalParents: number;
    totalClasses: number;
  };
  features?: {
    hasTransport?: boolean;
    hasCanteen?: boolean;
    hasLibrary?: boolean;
    hasSports?: boolean;
    hasComputerLab?: boolean;
  };
  schoolType?: string;
  establishedYear?: number;
  affiliationBoard?: string;
  website?: string;
  secondaryContact?: string;
  isActive?: boolean;
  establishedDate?: Date;
  admins?: string[];
  databaseName?: string;
  databaseCreated?: boolean;
  databaseCreatedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

const Dashboard: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Get auth token - improved to use AuthContext first
  const getAuthToken = () => {
    // First try the token from AuthContext
    if (token) {
      return token;
    }

    // Then try localStorage with the correct key
    try {
      const authData = localStorage.getItem('erp.auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.token;
      }
    } catch (e) {
      console.warn('Failed to parse auth data from localStorage:', e);
    }

    // Fallback to old storage methods
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  useEffect(() => {
    const fetchSchoolAndUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        const debug: any = {
          user: user,
          schoolIdentifier: user?.schoolId || user?.schoolCode,
          token: !!getAuthToken(),
          timestamp: new Date().toISOString()
        };

        console.log('🔍 Starting fetchSchoolAndUsers with debug info:', debug);
        setDebugInfo(debug);

        // Check if we have a valid school identifier
        const schoolIdentifier = user?.schoolId || user?.schoolCode;
        if (!schoolIdentifier) {
          throw new Error(`No school identifier found. Please log out and log back in to refresh your school association.`);
        }

        if (schoolIdentifier) {
          const token = getAuthToken();
          if (!token) {
            throw new Error('No authentication token found. Please log in again.');
          }

          try {
            // Fetch school details
            console.log('📡 Fetching school details for identifier:', schoolIdentifier);
            const schoolResponse = await schoolAPI.getSchoolById(schoolIdentifier);
            console.log('✅ School response:', schoolResponse);
            setSchool(schoolResponse.data);

            debug.schoolFetch = { success: true, schoolName: schoolResponse.data?.name };
          } catch (schoolErr: any) {
            console.error('❌ Error fetching school:', schoolErr);
            debug.schoolFetch = {
              success: false,
              error: schoolErr.message,
              status: schoolErr.response?.status,
              data: schoolErr.response?.data
            };
            // Don't set error state yet, continue with users
          }

          try {
            // Fetch school users using the correct API
            // Use schoolCode (P) for the API call, not schoolId (ObjectId)
            const schoolCodeForAPI = user?.schoolCode || 'P';
            console.log('📡 Fetching users for school code:', schoolCodeForAPI);
            const usersResponse = await schoolUserAPI.getAllUsers(schoolCodeForAPI, token);
            console.log('✅ Users response:', usersResponse);

            // Handle the new flat array format
            let allUsers: any[] = [];
            if (usersResponse && usersResponse.data && Array.isArray(usersResponse.data)) {
              // New format: flat array in data field
              allUsers = usersResponse.data;
            } else if (usersResponse && typeof usersResponse === 'object') {
              // Old format: grouped by role (fallback)
              const roles = ['admin', 'teacher', 'student', 'parent'];
              for (const role of roles) {
                if (usersResponse[role] && Array.isArray(usersResponse[role])) {
                  allUsers.push(...usersResponse[role].map((user: any) => ({ ...user, role })));
                }
              }
            }

            // Normalize user objects so `name` is always a string (displayName or first+last)
            const normalized = allUsers.map(u => {
              const userObj: any = { ...u };
              if (userObj.name && typeof userObj.name === 'object') {
                userObj.name = userObj.name.displayName || (((userObj.name.firstName || '') + ' ' + (userObj.name.lastName || '')).trim()) || userObj.email;
              }
              return userObj;
            });
            setUsers(normalized);
            debug.usersFetch = {
              success: true,
              totalUsers: allUsers.length,
              breakdown: allUsers.reduce((acc: Record<string, number>, user: any) => {
                acc[user.role] = (acc[user.role] || 0) + 1;
                return acc;
              }, {})
            };

          } catch (userErr: any) {
            console.error('❌ Error fetching users:', userErr);
            debug.usersFetch = {
              success: false,
              error: userErr.message,
              status: userErr.response?.status,
              data: userErr.response?.data
            };
            throw userErr; // Propagate user fetch errors
          }

          setDebugInfo({ ...debug });

        } else {
          // No school information in user object
          console.log('⚠️  User object:', user);
          debug.noSchoolInfo = true;

          if (user?.role === 'superadmin') {
            // SuperAdmin doesn't need school information
            setError(null);
            setSchool(null);
            setUsers([]);
            debug.superadminMode = true;
          } else {
            setError('No school associated with this account. Please contact support.');
            console.error('❌ No schoolId or schoolCode found in user object:', user);
            debug.missingSchoolAssociation = true;
          }

          setDebugInfo({ ...debug });
        }
      } catch (err: any) {
        console.error('💥 Error in fetchSchoolAndUsers:', err);
        setError(`Failed to load school information: ${err.message}`);
        setDebugInfo({
          ...debugInfo,
          generalError: {
            message: err.message,
            stack: err.stack,
            response: err.response?.data
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolAndUsers();
  }, [user]);
  console.log(user);

  // Calculate stats from actual user data
  const totalStudents = users.filter(user => user.role === 'student').length;
  const totalTeachers = users.filter(user => user.role === 'teacher').length;

  // Use real data from the school or fallback to sample data
  const stats = [
    { name: 'Total Students', value: totalStudents.toString(), icon: Users, color: 'bg-blue-500' },
    { name: 'Attendance Rate', value: '94.2%', icon: UserCheck, color: 'bg-green-500' },
    { name: 'Total Teachers', value: totalTeachers.toString(), icon: BookOpen, color: 'bg-purple-500' },
  ];

  const attendanceData = [
    { name: 'Mon', attendance: 95 },
    { name: 'Tue', attendance: 92 },
    { name: 'Wed', attendance: 98 },
    { name: 'Thu', attendance: 89 },
    { name: 'Fri', attendance: 94 },
  ];

  const gradeDistribution = [
    { name: 'Grade 1-2', students: 245 },
    { name: 'Grade 3-5', students: 312 },
    { name: 'Grade 6-8', students: 398 },
    { name: 'Grade 9-10', students: 292 },
  ];

  const pieData = [
    { name: 'Present', value: 1175, color: '#10B981' },
    { name: 'Absent', value: 72, color: '#EF4444' },
  ];

  const recentActivities = [
    { action: 'New student enrollment', time: '2 minutes ago', type: 'info' },
    { action: 'Assignment deadline approaching', time: '15 minutes ago', type: 'warning' },
    { action: 'New student admission completed', time: '1 hour ago', type: 'success' },
    { action: 'Parent message received', time: '2 hours ago', type: 'info' },
  ];

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-gray-600">Loading school data...</span>
        </div>
      ) : error ? (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 p-4 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-700 font-medium">Error Loading Data</p>
            </div>
            <p className="text-red-600 mt-2">{error}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </button>
              {!getAuthToken() && (
                <button
                  onClick={() => {
                    logout();
                    window.location.href = '/login';
                  }}
                  className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Login Again
                </button>
              )}
            </div>
          </div>

          {/* Debug Panel */}
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Bug className="h-5 w-5 text-gray-500 mr-2" />
                <h3 className="text-sm font-medium text-gray-700">Debug Information</h3>
              </div>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {showDebug ? 'Hide' : 'Show'} Details
              </button>
            </div>

            {showDebug && debugInfo && (
              <div className="bg-white p-3 rounded border text-xs">
                <pre className="whitespace-pre-wrap overflow-x-auto text-gray-600">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}

            <div className="text-xs text-gray-500 mt-2">
              <p>User Role: {user?.role}</p>
              <p>School ID: {user?.schoolId || 'Not found'}</p>
              <p>School Code: {user?.schoolCode || 'Not found'}</p>
              <p>Token Available: {!!getAuthToken() ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleDateString()}
            </div>
          </div>

          {/* School Info Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-col md:flex-row items-start md:items-center">
              {school?.logoUrl && (
                <div className="w-24 h-24 mr-6 mb-4 md:mb-0 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={school.logoUrl}
                    alt={`${school.name} logo`}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="flex-grow">
                <h2 className="text-2xl font-bold text-gray-900">{school?.name || user?.schoolName || 'Your School'}</h2>
                <p className="text-gray-500 mb-2">School Code: {school?.code || 'N/A'}</p>

                {/* Principal Information */}
                {school?.principalName && (
                  <p className="text-gray-600 mb-2">
                    <strong>Principal:</strong> {school.principalName}
                    {school?.principalEmail && (
                      <span className="text-gray-500 ml-2">({school.principalEmail})</span>
                    )}
                  </p>
                )}

                {/* Academic Information */}
                {(school?.settings?.academicYear?.currentYear || school?.settings?.classes?.length || school?.settings?.subjects?.length) && (
                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Academic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      {school?.settings?.academicYear?.currentYear && (
                        <div>
                          <span className="text-gray-600 font-medium">Academic Year:</span>
                          <span className="text-gray-800 ml-1">{school.settings.academicYear.currentYear}</span>
                        </div>
                      )}
                      {school?.settings?.classes?.length && (
                        <div>
                          <span className="text-gray-600 font-medium">Classes:</span>
                          <span className="text-gray-800 ml-1">{school.settings.classes.length} classes</span>
                        </div>
                      )}
                      {school?.settings?.subjects?.length && (
                        <div>
                          <span className="text-gray-600 font-medium">Subjects:</span>
                          <span className="text-gray-800 ml-1">{school.settings.subjects.length} subjects</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {/* Complete Address */}
                  <div className="flex items-start">
                    <Building className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <span className="text-gray-600 block">
                        {school?.address?.street && school?.address?.area && school?.address?.city ?
                          `${school.address.street}, ${school.address.area}, ${school.address.city}` :
                          school?.address?.street && school?.address?.city ?
                            `${school.address.street}, ${school.address.city}` :
                            school?.address?.street || school?.address?.city || 'Address not available'}
                      </span>
                      {school?.address?.district && (
                        <span className="text-gray-500 text-sm">{school.address.district}</span>
                      )}
                      {school?.address?.state && (
                        <span className="text-gray-500 text-sm block">{school.address.state}</span>
                      )}
                      {school?.address?.pinCode && (
                        <span className="text-gray-500 text-sm">PIN: {school.address.pinCode}</span>
                      )}
                    </div>
                  </div>

                  {/* Primary Phone */}
                  {(school?.contact?.phone || school?.mobile) && (
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <span className="text-gray-600">{school.contact?.phone || school.mobile}</span>
                        {school?.secondaryContact && (
                          <span className="text-gray-500 text-sm block">Alt: {school.secondaryContact}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  {(school?.contact?.email || school?.principalEmail) && (
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-600">{school.contact?.email || school.principalEmail}</span>
                    </div>
                  )}

                  {/* Website */}
                  {(school?.contact?.website || school?.website) && (
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                      <a
                        href={(school.contact?.website || school.website)?.startsWith('http') ?
                          (school.contact?.website || school.website) :
                          `https://${school.contact?.website || school.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {school.contact?.website || school.website}
                      </a>
                    </div>
                  )}

                  {/* School Type & Established Year */}
                  {(school?.schoolType || school?.establishedYear) && (
                    <div className="flex items-center">
                      <Building className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        {school?.schoolType && (
                          <span className="text-gray-600 block">{school.schoolType} School</span>
                        )}
                        {school?.establishedYear && (
                          <span className="text-gray-500 text-sm">Est. {school.establishedYear}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Affiliation Board */}
                  {school?.affiliationBoard && (
                    <div className="flex items-center">
                      <TrendingUp className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-600">{school.affiliationBoard} Affiliated</span>
                    </div>
                  )}

                  {/* Working Hours */}
                  {school?.settings?.workingHours && (
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-600">
                        {school.settings.workingHours.start} - {school.settings.workingHours.end}
                      </span>
                    </div>
                  )}

                  {/* Working Days */}
                  {school?.settings?.workingDays && school.settings.workingDays.length > 0 && (
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-600">
                        {school.settings.workingDays.join(', ')}
                      </span>
                    </div>
                  )}

                  {/* School Features */}
                  {school?.features && (
                    <div className="flex items-start">
                      <TrendingUp className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <span className="text-gray-600 text-sm">
                          {[
                            school.features.hasTransport && 'Transport',
                            school.features.hasCanteen && 'Canteen',
                            school.features.hasLibrary && 'Library',
                            school.features.hasSports && 'Sports',
                            school.features.hasComputerLab && 'Computer Lab'
                          ].filter(Boolean).join(', ') || 'Basic facilities'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.map((stat) => (
              <div key={stat.name} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Users Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Associated Users
              <span className="text-sm font-normal text-gray-500 ml-2">({users.length} total)</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.length > 0 ? (
                    users.slice(0, 5).map((user) => (
                      <tr key={user._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {typeof (user as any).name === 'string'
                              ? (user as any).name
                              : ((user as any).name?.displayName || (((user as any).name?.firstName || '') + ' ' + ((user as any).name?.lastName || '')).trim() || user.email || 'Unknown User')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                              user.role === 'student' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        No users found for this school
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {users.length > 5 && (
                <div className="px-6 py-4 text-center">
                  <Link to="/admin/users" className="text-sm text-blue-600 hover:text-blue-800">
                    View all {users.length} users
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Attendance */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Attendance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="attendance" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Student Distribution */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Students by Grade</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={gradeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="students" stroke="#10B981" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Attendance Overview */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Attendance</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center space-x-4 mt-2">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activities */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center p-3 rounded-lg bg-gray-50">
                    <div className={`w-3 h-3 rounded-full mr-3 ${activity.type === 'success' ? 'bg-green-500' :
                      activity.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          {/* <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/admin/users" className="flex items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <Users className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-700">Manage Users</span>
              </Link>
              <Link to="/admin/attendance/mark" className="flex items-center justify-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                <UserCheck className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-700">Mark Attendance</span>
              </Link>
              <Link to="/admin/assignments" className="flex items-center justify-center p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors">
                <BookOpen className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="text-sm font-medium text-yellow-700">Assignments</span>
              </Link>
            </div>
          </div> */}
        </>
      )}
    </div>
  );
};

export default Dashboard;
