import React from 'react';
import { Chalan } from '../../types/chalan';
import { format } from 'date-fns';

interface ChalanViewProps {
  chalan: Chalan;
  copyType?: 'student' | 'office' | 'admin';
  className?: string;
}

const ChalanView: React.FC<ChalanViewProps> = ({ 
  chalan, 
  copyType = 'student',
  className = '' 
}) => {
  const getCopyLabel = () => {
    switch (copyType) {
      case 'student':
        return 'STUDENT COPY';
      case 'office':
        return 'OFFICE COPY';
      case 'admin':
        return 'ADMIN COPY';
      default:
        return 'CHALAN COPY';
    }
  };

  const getBorderColor = () => {
    switch (copyType) {
      case 'student':
        return 'border-blue-500';
      case 'office':
        return 'border-green-500';
      case 'admin':
        return 'border-purple-500';
      default:
        return 'border-gray-300';
    }
  };

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto border-l-4 ${getBorderColor()} ${className}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">SCHOOL NAME</h1>
        <p className="text-sm text-gray-600">123 School Street, City, State - 123456</p>
        <p className="text-xs text-gray-500">Phone: +91-9876543210 | Email: info@school.com</p>
        <div className="border-t border-gray-300 my-3"></div>
      </div>

      {/* Chalan Title */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">FEE PAYMENT CHALAN</h2>
        <div className="mt-1">
          <span className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
            {getCopyLabel()}
          </span>
        </div>
      </div>

      {/* Chalan Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <div className="mb-2">
            <span className="font-medium text-gray-700">Chalan No:</span>{' '}
            <span className="text-gray-900">{chalan.chalanNumber}</span>
          </div>
          <div className="mb-2">
            <span className="font-medium text-gray-700">Student Name:</span>{' '}
            <span className="text-gray-900">Student Name</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Class/Section:</span>{' '}
            <span className="text-gray-900">{chalan.class} - {chalan.section}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="mb-2">
            <span className="font-medium text-gray-700">Date:</span>{' '}
            <span className="text-gray-900">
              {format(new Date(chalan.createdAt), 'dd/MM/yyyy')}
            </span>
          </div>
          <div className="mb-2">
            <span className="font-medium text-gray-700">Due Date:</span>{' '}
            <span className="text-gray-900">
              {format(new Date(chalan.dueDate), 'dd/MM/yyyy')}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Status:</span>{' '}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              chalan.status === 'paid' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {chalan.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Fee Details */}
      <div className="border border-gray-200 rounded-md overflow-hidden mb-6">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Description</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-200">
              <td className="px-4 py-3">
                {chalan.installmentName || 'Total Fee'}
              </td>
              <td className="px-4 py-3 text-right">
                ₹{chalan.totalAmount.toFixed(2)}
              </td>
            </tr>
            <tr className="bg-gray-50 font-semibold">
              <td className="px-4 py-3 border-t border-gray-200">Total Payable</td>
              <td className="px-4 py-3 text-right border-t border-gray-200">
                ₹{chalan.totalAmount.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Bank Details</h3>
          <div className="text-sm text-gray-700 space-y-1">
            <p>Bank Name: State Bank of India</p>
            <p>Account Name: School Name</p>
            <p>Account Number: 1234567890</p>
            <p>IFSC Code: SBIN0001234</p>
            <p>Branch: Main Branch, City</p>
          </div>
        </div>
        <div className="flex flex-col items-end justify-end">
          <div className="mt-8 text-center">
            <div className="border-t-2 border-black w-40 mx-auto mb-1"></div>
            <p className="text-sm text-gray-700">Student/Parent Signature</p>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-8 text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
        <p>This is a computer generated document. No signature required.</p>
        <p className="mt-1">For office use only</p>
      </div>
    </div>
  );
};

export default ChalanView;
