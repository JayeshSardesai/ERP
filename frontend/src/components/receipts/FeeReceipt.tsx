import React from 'react';
import { Printer } from 'lucide-react';

export interface InstallmentDetail {
  name: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: 'Paid' | 'Partial' | 'Unpaid';
  paymentDate?: string;
  receiptNo?: string;
}

interface FeeReceiptProps {
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  receiptNo: string;
  date: string;
  studentName: string;
  fatherName: string;
  className: string;
  rollNo: string;
  admissionNo: string;
  feeDetails: Array<{
    name: string;
    amount: number;
  }>;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  receivedBy: string;
  paymentMode: string;
  paymentDate: string;
  installments: InstallmentDetail[];
  academicYear?: string;
  paymentId?: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
};

const FeeReceipt: React.FC<FeeReceiptProps> = ({
  schoolName,
  schoolAddress,
  schoolPhone,
  receiptNo,
  date,
  studentName,
  fatherName,
  className,
  rollNo,
  admissionNo,
  feeDetails,
  totalAmount,
  paidAmount,
  balance,
  receivedBy,
  paymentMode,
  paymentDate,
  installments,
  academicYear = '2023-24',
  paymentId,
}) => {
  const handlePrint = () => {
    window.print();
  };

  // Calculate totals
  const totalFee = totalAmount;
  const totalPaid = paidAmount;
  const totalDue = balance;
  const currentInstallment = installments.find(inst => inst.receiptNo === receiptNo);
  
  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-lg print:shadow-none print:p-0">
        {/* Print Button */}
        <div className="text-right mb-4 print:hidden">
          <button
            onClick={handlePrint}
            className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm hover:bg-blue-700 transition-colors"
          >
            <Printer size={16} />
            Print Receipt
          </button>
        </div>

      {/* Receipt Content */}
      <div className="border-2 border-gray-300 p-6 print:border-0">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{schoolName}</h1>
          <p className="text-sm text-gray-600 mt-1">{schoolAddress}</p>
          <p className="text-sm text-gray-600">Phone: {schoolPhone}</p>
          <div className="mt-2">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
              FEE PAYMENT RECEIPT
            </span>
          </div>
        </div>

        {/* Receipt Info */}
        <div className="flex justify-between items-start mb-6 text-sm">
          <div>
            <p><span className="font-medium">Receipt No:</span> {receiptNo}</p>
            <p><span className="font-medium">Date:</span> {formatDate(paymentDate) || date}</p>
            {academicYear && <p><span className="font-medium">Academic Year:</span> {academicYear}</p>}
          </div>
          <div className="text-right">
            <p className="font-medium">School Copy</p>
            <p className="text-xs text-gray-500">(For Office Use Only)</p>
          </div>
        </div>

        {/* Student Info */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Student Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p><span className="font-medium text-gray-700">Student Name:</span> {studentName}</p>
              <p><span className="font-medium text-gray-700">Father's Name:</span> {fatherName}</p>
              <p><span className="font-medium text-gray-700">Payment Date:</span> {formatDate(paymentDate)}</p>
            </div>
            <div className="space-y-1">
              <p><span className="font-medium text-gray-700">Class & Section:</span> {className}</p>
              <p><span className="font-medium text-gray-700">Roll No:</span> {rollNo}</p>
              <p><span className="font-medium text-gray-700">Admission No:</span> {admissionNo}</p>
            </div>
          </div>
        </div>

        {/* Current Payment Summary */}
        {currentInstallment && (
          <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded-md border border-blue-100">
                <p className="text-sm text-gray-600">Installment</p>
                <p className="font-medium text-gray-900">{currentInstallment.name}</p>
              </div>
              <div className="bg-white p-3 rounded-md border border-blue-100">
                <p className="text-sm text-gray-600">Amount Paid</p>
                <p className="font-medium text-green-700">{formatCurrency(currentInstallment.paidAmount)}</p>
              </div>
              <div className="bg-white p-3 rounded-md border border-blue-100">
                <p className="text-sm text-gray-600">Payment Mode</p>
                <p className="font-medium text-gray-900">{paymentMode}</p>
              </div>
            </div>
          </div>
        )}

        {/* Fee Summary */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold border-b border-gray-300 pb-2 mb-3">Fee Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <p className="text-sm text-gray-600">Total Annual Fee</p>
              <p className="text-xl font-bold text-blue-800">{formatCurrency(totalFee)}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <p className="text-sm text-gray-600">Total Amount Paid</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
              <p className="text-sm text-gray-600">Balance Due</p>
              <p className="text-xl font-bold text-red-700">{formatCurrency(totalDue)}</p>
            </div>
          </div>

          {/* Installment Details */}
          <div className="mt-6">
            <h4 className="text-lg font-semibold border-b border-gray-300 pb-2 mb-3">Installment Details</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">Installment</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">Due Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">Balance</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {installments.map((installment, index) => {
                    const isCurrentPayment = currentInstallment && installment.name === currentInstallment.name;
                    return (
                      <tr 
                        key={index} 
                        className={`${isCurrentPayment ? 'bg-blue-50' : ''} ${installment.status === 'Paid' ? 'bg-green-50' : ''}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm border-b border-gray-200">
                          <div className="font-medium text-gray-900">{installment.name}</div>
                          {installment.receiptNo && (
                            <div className="text-xs text-gray-500">Receipt: {installment.receiptNo}</div>
                          )}
                          {isCurrentPayment && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              Current Payment
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right border-b border-gray-200">
                          {formatDate(installment.dueDate)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right border-b border-gray-200">
                          {formatCurrency(installment.amount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 text-right border-b border-gray-200">
                          {formatCurrency(installment.paidAmount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 text-right border-b border-gray-200">
                          {formatCurrency(installment.amount - installment.paidAmount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center border-b border-gray-200">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            installment.status === 'Paid' 
                              ? 'bg-green-100 text-green-800' 
                              : installment.status === 'Partial' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-red-100 text-red-800'
                          }`}>
                            {installment.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 font-medium">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-right text-sm font-semibold border-t border-gray-200">Total</td>
                    <td className="px-4 py-3 text-right text-sm border-t border-gray-200">
                      {formatCurrency(installments.reduce((sum, i) => sum + i.amount, 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-green-700 border-t border-gray-200">
                      {formatCurrency(installments.reduce((sum, i) => sum + i.paidAmount, 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-red-700 border-t border-gray-200">
                      {formatCurrency(installments.reduce((sum, i) => sum + (i.amount - i.paidAmount), 0))}
                    </td>
                    <td className="border-t border-gray-200"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            {/* Payment Summary */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="text-sm font-medium text-gray-700">Total Fee</p>
                <p className="text-xl font-bold text-blue-800">{formatCurrency(totalFee)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <p className="text-sm font-medium text-gray-700">Total Paid</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <p className="text-sm font-medium text-gray-700">Balance Due</p>
                <p className="text-xl font-bold text-red-700">{formatCurrency(totalDue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fee Breakdown */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold border-b border-gray-300 pb-2 mb-3">Fee Breakdown</h4>
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Particulars</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {feeDetails.map((fee, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{fee.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(fee.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-medium">
                  <td className="px-4 py-3 text-right text-sm font-semibold">Total Fee</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">
                    {formatCurrency(feeDetails.reduce((sum, fee) => sum + fee.amount, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment and Authorization */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Payment Information</h5>
              <div className="space-y-1">
                <p><span className="font-medium">Payment Mode:</span> {paymentMode}</p>
                <p><span className="font-medium">Payment Date:</span> {formatDate(paymentDate)}</p>
                {paymentId && (
                  <p><span className="font-medium">Transaction ID:</span> {paymentId}</p>
                )}
                <p><span className="font-medium">Received By:</span> {receivedBy}</p>
              </div>
            </div>
            <div className="md:text-right">
              <h5 className="font-medium text-gray-700 mb-2">Authorized Signatory</h5>
              <div className="mt-8 pt-6 border-t border-gray-200 inline-block">
                <p className="font-medium">For {schoolName}</p>
                <p className="text-xs text-gray-500 mt-1">(Authorized Signature & Stamp)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          <p>This is a computer-generated receipt. No signature required.</p>
          <p className="mt-1">Please keep this receipt for future reference.</p>
          <p className="mt-2">For any queries, please contact the school office.</p>
          <p className="mt-2 font-medium">Thank you for your payment!</p>
        </div>
      </div>
    </div>
    </>
  );
};

export default FeeReceipt;
