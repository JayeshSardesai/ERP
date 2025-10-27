import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import Dashboard from './pages/Dashboard'
import ManageUsers from './pages/ManageUsers'
import SchoolSettings from './pages/SchoolSettings'
import AcademicDetails from './pages/AcademicDetails'
import IDCardTemplatePreview from '../../pages/Settings/IDCardTemplatePreview'
import AcademicDetailsSimple from './pages/AcademicDetailsSimple'
import AttendanceHome from './pages/AttendanceHome'
import MarkAttendance from './pages/MarkAttendance'
import ViewAttendanceRecords from './pages/ViewAttendanceRecords'
import Assignments from './pages/Assignments'
import Results from './pages/Results'
import TestComponent from './pages/TestComponent'
import AcademicResultsEntry from './pages/AcademicResultsEntry'
import MessagesPage from './pages/MessagesPage'
import FeesPage from './pages/FeesPage'
import ReportsPage from './pages/ReportsPage'
import ErrorBoundary from '../../components/ErrorBoundary'
import { PermissionGuard } from '../../components/PermissionGuard'
import { PermissionProvider } from '../../hooks/usePermissions'

export function AdminApp() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<ManageUsers />} />
        <Route path="manage-users" element={<ManageUsers />} />
        <Route path="settings" element={<SchoolSettings />} />
        <Route path="school-settings" element={<SchoolSettings />} />
        <Route path="settings/idcard-templates" element={<IDCardTemplatePreview />} />
        <Route path="academic-details" element={
          <ErrorBoundary>
            <AcademicDetails />
          </ErrorBoundary>
        } />
        <Route path="attendance" element={<AttendanceHome />} />
        <Route path="attendance/mark" element={<AttendanceHome />} />
        <Route path="attendance/view" element={<AttendanceHome />} />
        <Route path="assignments" element={
          <ErrorBoundary>
            <Assignments />
          </ErrorBoundary>
        } />
        <Route path="results" element={<Results />} />
        <Route path="results/entry" element={
          <ErrorBoundary>
            <AcademicResultsEntry />
          </ErrorBoundary>
        } />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="fees/structure" element={<FeesPage />} />
        <Route path="fees/payments" element={<FeesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="*" element={<Navigate to="/admin" />} />
      </Routes>
    </AdminLayout>
  )
}
