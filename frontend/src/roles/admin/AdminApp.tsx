import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import Dashboard from './pages/Dashboard'
import ManageUsers from './pages/ManageUsers'
import SchoolSettings from './pages/SchoolSettings'
import AcademicDetails from './pages/AcademicDetails'
import AcademicDetailsSimple from './pages/AcademicDetailsSimple'
import MarkAttendance from './pages/MarkAttendance'
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
    <PermissionProvider>
      <AdminLayout>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="users" element={
            <PermissionGuard permission="manageUsers" permissionName="Manage Users">
              <ManageUsers />
            </PermissionGuard>
          } />
          <Route path="manage-users" element={
            <PermissionGuard permission="manageUsers" permissionName="Manage Users">
              <ManageUsers />
            </PermissionGuard>
          } />
          <Route path="settings" element={
            <PermissionGuard permission="manageSchoolSettings" permissionName="School Settings">
              <SchoolSettings />
            </PermissionGuard>
          } />
          <Route path="school-settings" element={
            <PermissionGuard permission="manageSchoolSettings" permissionName="School Settings">
              <SchoolSettings />
            </PermissionGuard>
          } />
          <Route path="academic-details" element={
            <PermissionGuard permission="viewAcademicDetails" permissionName="Academic Details">
              <ErrorBoundary>
                <AcademicDetails />
              </ErrorBoundary>
            </PermissionGuard>
          } />
          <Route path="attendance/mark" element={
            <PermissionGuard permission="viewAttendance" permissionName="Attendance">
              <MarkAttendance />
            </PermissionGuard>
          } />
          <Route path="assignments" element={
            <PermissionGuard permission="viewAssignments" permissionName="Assignments">
              <ErrorBoundary>
                <Assignments />
              </ErrorBoundary>
            </PermissionGuard>
          } />
          <Route path="results" element={
            <PermissionGuard permission="viewResults" permissionName="Results">
              <Results />
            </PermissionGuard>
          } />
          <Route path="results/entry" element={
            <PermissionGuard permission="viewResults" permissionName="Results">
              <ErrorBoundary>
                <AcademicResultsEntry />
              </ErrorBoundary>
            </PermissionGuard>
          } />
          <Route path="messages" element={
            <PermissionGuard permission="messageStudentsParents" permissionName="Messages">
              <MessagesPage />
            </PermissionGuard>
          } />
          <Route path="fees/structure" element={
            <PermissionGuard permission="viewFees" permissionName="Fees">
              <FeesPage />
            </PermissionGuard>
          } />
          <Route path="fees/payments" element={
            <PermissionGuard permission="viewFees" permissionName="Fees">
              <FeesPage />
            </PermissionGuard>
          } />
          <Route path="reports" element={
            <PermissionGuard permission="viewReports" permissionName="Reports">
              <ReportsPage />
            </PermissionGuard>
          } />
          <Route path="*" element={<Navigate to="/admin" />} />
        </Routes>
      </AdminLayout>
    </PermissionProvider>
  )
}
