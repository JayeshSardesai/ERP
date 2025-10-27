import React from 'react';
import DualCopyReceipt from './DualCopyReceipt';

const ReceiptExample: React.FC = () => {
  // Sample data for testing the receipt component
  const sampleData = {
    schoolData: {
      schoolName: 'SK',
      schoolCode: 'SK',
      address: '123 School Street, City, State 12345',
      phone: '+91-XXXXXXXXXX',
      email: 'info@school.com',
      website: 'www.edulogix.com'
    },
    studentData: {
      name: 'Umang Sarin',
      studentId: 'SK-S-0000',
      class: '10',
      section: 'B',
      academicYear: '2025-26'
    },
    paymentData: {
      receiptNumber: 'RCP-SK-2025-00003',
      paymentDate: '2025-10-24',
      paymentMethod: 'cash',
      paymentReference: '-',
      amount: 33300,
      installmentName: 'Installment 1'
    },
    installments: [
      {
        name: 'Installment 1',
        amount: 33300,
        paid: 33300,
        remaining: 0,
        isCurrent: true
      },
      {
        name: 'Installment 2',
        amount: 33300,
        paid: 0,
        remaining: 33300,
        isCurrent: false
      },
      {
        name: 'Installment 3',
        amount: 33400,
        paid: 0,
        remaining: 33400,
        isCurrent: false
      }
    ],
    totalAmount: 100000,
    totalPaid: 33300,
    totalRemaining: 66700
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Receipt Example</h1>
      <DualCopyReceipt
        schoolData={sampleData.schoolData}
        studentData={sampleData.studentData}
        paymentData={sampleData.paymentData}
        installments={sampleData.installments}
        totalAmount={sampleData.totalAmount}
        totalPaid={sampleData.totalPaid}
        totalRemaining={sampleData.totalRemaining}
      />
    </div>
  );
};

export default ReceiptExample;
