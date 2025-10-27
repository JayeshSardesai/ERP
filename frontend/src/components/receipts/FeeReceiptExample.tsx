import React from 'react';
import FeeReceipt, { InstallmentDetail } from './FeeReceipt';

const FeeReceiptExample: React.FC = () => {
  const feeDetails = [
    { name: 'Tuition Fee', amount: 30000 },
    { name: 'Transportation Fee', amount: 12000 },
    { name: 'Library Fee', amount: 2000 },
    { name: 'Activity Fee', amount: 3000 },
    { name: 'Examination Fee', amount: 1500 },
  ];

  const installments: InstallmentDetail[] = [
    {
      name: '1st Installment',
      dueDate: '10-Apr-2023',
      amount: 9500,
      paidAmount: 9500,
      status: 'Paid',
      paymentDate: '05-Apr-2023',
      receiptNo: 'RCPT-2023-001'
    },
    {
      name: '2nd Installment',
      dueDate: '10-Jul-2023',
      amount: 9500,
      paidAmount: 5000,
      status: 'Partial',
      paymentDate: '15-Jul-2023',
      receiptNo: 'RCPT-2023-045'
    },
    {
      name: '3rd Installment',
      dueDate: '10-Oct-2023',
      amount: 9500,
      paidAmount: 0,
      status: 'Unpaid'
    },
    {
      name: '4th Installment',
      dueDate: '10-Jan-2024',
      amount: 9500,
      paidAmount: 0,
      status: 'Unpaid'
    }
  ];

  const totalAmount = feeDetails.reduce((sum, fee) => sum + fee.amount, 0);
  const paidAmount = installments.reduce((sum, inst) => sum + inst.paidAmount, 0);
  const balance = totalAmount - paidAmount;

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">Fee Payment Receipt</h1>
        <FeeReceipt
          schoolName="GLOBAL PUBLIC SCHOOL"
          schoolAddress="123 Education Street, Knowledge City, State - 123456, India"
          schoolPhone="+91-9876543210 | 0123-4567890"
          receiptNo="RCPT-2023-045"
          date={new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })}
          studentName="RAHUL KUMAR SHARMA"
          fatherName="MR. SANJAY KUMAR SHARMA"
          className="XII - A"
          rollNo="25"
          admissionNo="ADM-2022-125"
          feeDetails={feeDetails}
          totalAmount={totalAmount}
          paidAmount={paidAmount}
          balance={balance}
          receivedBy="Mrs. Sunita Verma"
          paymentMode="Online Transfer"
          paymentDate={new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
          installments={installments}
          academicYear="2023-24"
          paymentId="PAY-2023-00789"
        />
      </div>
    </div>
  );
};

export default FeeReceiptExample;
