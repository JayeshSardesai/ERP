import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Home,
  Users,
  Settings,
  Calendar,
  UserCheck,
  BookOpen,
  BarChart3,
  Bell,
  User,
  LogOut,
  GraduationCap,
  MessageSquare,
  CreditCard,
  FileText
} from 'lucide-react';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/admin/', icon: Home },
    { name: 'Manage Users', href: '/admin/users', icon: Users },
    { name: 'School Settings', href: '/admin/settings', icon: Settings },
    { name: 'Academic Details', href: '/admin/academic-details', icon: GraduationCap },
    { name: 'Attendance', href: '/admin/attendance', icon: UserCheck },
    { name: 'Assignments', href: '/admin/assignments', icon: BookOpen },
    { name: 'Results', href: '/admin/results', icon: BarChart3 },
    { name: 'Messages', href: '/admin/messages', icon: MessageSquare },
    { name: 'Fees', href: '/admin/fees/structure', icon: CreditCard },
    { name: 'Reports', href: '/admin/reports', icon: FileText },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg hidden lg:flex flex-col">
        <div className="h-16 px-6 flex items-center bg-blue-600">
          <h1 className="text-xl font-bold text-white">ERP Admin Portal</h1>
        </div>
        <nav className="mt-8 px-4 space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive(item.href) || location.pathname.startsWith(item.href + '/')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-6 flex items-center justify-between bg-blue-600">
          <h1 className="text-xl font-bold text-white">ERP Admin Portal</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-white hover:bg-blue-700 p-1 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="mt-8 px-4 space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive(item.href) || location.pathname.startsWith(item.href + '/')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex items-center space-x-4">
              <button className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100">
                <Bell className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">Admin User</span>
                <button className="text-gray-500 hover:text-gray-700 p-1 rounded">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
