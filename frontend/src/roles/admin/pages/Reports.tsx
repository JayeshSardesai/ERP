import React, { useState, useEffect } from 'react';
import { Download, Calendar, BarChart3, Users, TrendingUp, FileText, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../../../auth/AuthContext';

const Reports: React.FC = () => {
  const { user, token } = useAuth();
  const [selectedReport, setSelectedReport] = useState('attendance');
  const [dateRange, setDateRange] = useState('month');
  const [attendanceRate, setAttendanceRate] = useState<string>('0.0%');

  // Fetch attendance statistics
  useEffect(() => {
    const fetchAttendanceStats = async () => {
      try {
        const authToken = token || localStorage.getItem('erp.auth') ? JSON.parse(localStorage.getItem('erp.auth') || '{}').token : null;
        if (!authToken || !user?.schoolCode) return;

        const response = await fetch(
          `http://localhost:5050/api/attendance/stats`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.attendanceRate) {
            setAttendanceRate(data.attendanceRate);
          } else if (data.averageAttendance !== undefined) {
            setAttendanceRate(`${data.averageAttendance}%`);
          }
        }
      } catch (err) {
        console.error('Error fetching attendance stats:', err);
        setAttendanceRate('94.2%'); // Fallback to default
      }
    };

    fetchAttendanceStats();
  }, [user, token]);

  const attendanceData = [
    { month: 'Sep', rate: 94.2 },
    { month: 'Oct', rate: 92.8 },
    { month: 'Nov', rate: 95.1 },
    { month: 'Dec', rate: 93.7 },
    { month: 'Jan', rate: 94.5 },
  ];

  const academicData = [
    { subject: 'Math', average: 82.4, students: 247 },
    { subject: 'English', average: 84.6, students: 247 },
    { subject: 'Science', average: 85.4, students: 247 },
    { subject: 'History', average: 83.2, students: 247 },
    { subject: 'Physics', average: 79.8, students: 156 },
    { subject: 'Chemistry', average: 81.2, students: 156 },
  ];

  const gradeDistribution = [
    { name: 'A+ (90-100)', value: 18, color: '#10B981' },
    { name: 'A (80-89)', value: 32, color: '#3B82F6' },
    { name: 'B (70-79)', value: 28, color: '#F59E0B' },
    { name: 'C (60-69)', value: 15, color: '#EF4444' },
    { name: 'D (Below 60)', value: 7, color: '#6B7280' },
  ];

  const teacherPerformance = [
    { name: 'Mr. Smith', subjects: 'Math, Physics', classes: 5, avgScore: 84.2, attendance: 96.3 },
    { name: 'Ms. Johnson', subjects: 'English', classes: 4, avgScore: 86.1, attendance: 94.7 },
    { name: 'Dr. Brown', subjects: 'Science, Chemistry', classes: 6, avgScore: 82.8, attendance: 95.2 },
    { name: 'Mrs. Davis', subjects: 'History', classes: 3, avgScore: 81.5, attendance: 93.9 },
  ];

  const reportTypes = [
    { id: 'attendance', name: 'Attendance Report', icon: Users },
    { id: 'academic', name: 'Academic Performance', icon: BarChart3 },
    { id: 'teacher', name: 'Teacher Performance', icon: TrendingUp },
    { id: 'financial', name: 'Financial Report', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <div className="flex space-x-3">
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors">
            <Download className="h-4 w-4 mr-2" />
            Export All Reports
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4 mb-4">
          {reportTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedReport(type.id)}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                selectedReport === type.id
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <type.icon className="h-4 w-4 mr-2" />
              {type.name}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {selectedReport === 'attendance' && (
        <div className="space-y-6">
          {/* Attendance Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="bg-blue-500 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Overall Attendance</p>
                  <p className="text-2xl font-bold text-gray-900">{attendanceRate}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="bg-green-500 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Monthly Trend</p>
                  <p className="text-2xl font-bold text-green-600">+2.3%</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="bg-yellow-500 p-3 rounded-lg">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Present Today</p>
                  <p className="text-2xl font-bold text-gray-900">1,175</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="bg-red-500 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Absent Today</p>
                  <p className="text-2xl font-bold text-gray-900">72</p>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Trend Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Attendance Trends</h3>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center text-sm">
                <Download className="h-4 w-4 mr-2" />
                Export Chart
              </button>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip />
                <Line type="monotone" dataKey="rate" stroke="#3B82F6" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Class-wise Attendance */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Class-wise Attendance Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Students</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present Today</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Average</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {['Grade 8A', 'Grade 8B', 'Grade 9A', 'Grade 9B', 'Grade 10A'].map((className, index) => (
                    <tr key={className}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{className}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">{30 + index * 2}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">{28 + index}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-green-600 font-medium">{(93.5 + index * 0.8).toFixed(1)}%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">{(92.1 + index * 0.6).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedReport === 'academic' && (
        <div className="space-y-6">
          {/* Academic Performance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="bg-blue-500 p-3 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">School Average</p>
                  <p className="text-2xl font-bold text-gray-900">83.1%</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="bg-green-500 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pass Rate</p>
                  <p className="text-2xl font-bold text-green-600">96.4%</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="bg-yellow-500 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Top Performers</p>
                  <p className="text-2xl font-bold text-gray-900">23</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="bg-purple-500 p-3 rounded-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Subjects Taught</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                </div>
              </div>
            </div>
          </div>

          {/* Subject Performance Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Subject-wise Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={academicData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="average" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Grade Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {gradeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {gradeDistribution.map((item) => (
                  <div key={item.name} className="flex items-center text-sm">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                    <span className="text-gray-600">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedReport === 'teacher' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Teacher Performance Overview</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subjects</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Student Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teacherPerformance.map((teacher) => (
                    <tr key={teacher.name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{teacher.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">{teacher.subjects}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">{teacher.classes}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-blue-600 font-medium">{teacher.avgScore}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-green-600 font-medium">{teacher.attendance}%</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          teacher.avgScore >= 85 ? 'bg-green-100 text-green-800' :
                          teacher.avgScore >= 80 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {teacher.avgScore >= 85 ? 'Excellent' : teacher.avgScore >= 80 ? 'Good' : 'Needs Improvement'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedReport === 'financial' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">₹12,45,000</div>
                <div className="text-sm text-gray-600">Total Fee Collection</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">₹2,35,000</div>
                <div className="text-sm text-gray-600">Pending Fees</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-600">84.2%</div>
                <div className="text-sm text-gray-600">Collection Rate</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;