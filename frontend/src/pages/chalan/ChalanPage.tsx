import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chalan } from '../../types/chalan';
import ChalanList from '../../components/chalan/ChalanList';
import ChalanGenerationForm from '../../components/chalan/ChalanGenerationForm';
import ViewChalan from '../../components/fees/ViewChalan';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { PlusIcon, PrinterIcon, XIcon } from '@heroicons/react/outline';

const ChalanPage: React.FC = () => {
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [viewChalan, setViewChalan] = useState<Chalan | null>(null);
  const [printMode, setPrintMode] = useState(false);
  const navigate = useNavigate();

  // Mock data - replace with actual data from your API
  const classes = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const sections = ['A', 'B', 'C'];
  const installments = ['1st Installment', '2nd Installment', '3rd Installment', '4th Installment'];

  const handleGenerateSuccess = () => {
    setIsGenerateModalOpen(false);
    // Refresh the chalan list or show success message
  };

  const handleViewChalan = (chalan: Chalan) => {
    console.log('Viewing chalan:', chalan);
    setViewChalan(chalan);
    setPrintMode(false);
  };

  const handlePrintChalan = (chalan: Chalan) => {
    console.log('Printing chalan:', chalan);
    setViewChalan(chalan);
    setPrintMode(true);
    
    // Small delay to ensure the modal is rendered before printing
    setTimeout(() => {
      try {
        window.print();
      } catch (error) {
        console.error('Error during printing:', error);
      } finally {
        // Don't close print mode immediately to allow print dialog to stay open
        setTimeout(() => setPrintMode(false), 1000);
      }
    }, 500);
  };

  const handleCloseView = () => {
    setViewChalan(null);
    setPrintMode(false);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Fee Chalans</h1>
          <p className="text-sm text-gray-600">Manage and generate fee payment chalans</p>
        </div>
        <Button
          onClick={() => setIsGenerateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Generate Chalan
        </Button>
      </div>

      {/* Chalan List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <ChalanList 
          onViewChalan={handleViewChalan}
          onPrintChalan={handlePrintChalan}
        />
      </div>

      {/* Generate Chalan Modal */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title="Generate Fee Chalans"
        size="3xl"
      >
        <ChalanGenerationForm
          onSuccess={handleGenerateSuccess}
          onCancel={() => setIsGenerateModalOpen(false)}
          classes={classes}
          sections={sections}
          installments={installments}
        />
      </Modal>

      {/* View Chalan Modal */}
      <ViewChalan
        isOpen={!!viewChalan}
        onClose={handleCloseView}
        printMode={printMode}
        chalan={{
          chalanNumber: viewChalan?.chalanNumber || 'N/A',
          chalanDate: viewChalan?.createdAt 
            ? new Date(viewChalan.createdAt).toISOString() 
            : new Date().toISOString(),
          chalanStatus: viewChalan?.status || 'unpaid',
          installmentName: viewChalan?.installmentName || 'Fee Payment',
          amount: viewChalan?.amount || 0,
          totalAmount: viewChalan?.totalAmount || viewChalan?.amount || 0,
          dueDate: viewChalan?.dueDate 
            ? new Date(viewChalan.dueDate).toISOString() 
            : new Date().toISOString(),
          studentName: (typeof viewChalan?.studentId === 'object' 
            ? viewChalan.studentId.name 
            : viewChalan?.studentName) || 'N/A',
          studentId: typeof viewChalan?.studentId === 'object' 
            ? viewChalan.studentId._id 
            : viewChalan?.studentId || '',
          admissionNumber: viewChalan?.admissionNumber || 
            (typeof viewChalan?.studentId === 'object' ? viewChalan.studentId.admissionNo : '') || 'N/A',
          className: viewChalan?.class || 'N/A',
          section: viewChalan?.section || 'N/A',
          schoolId: viewChalan?.schoolId || '',
          academicYear: (viewChalan as any)?.academicYear || new Date().getFullYear().toString(),
          schoolName: 'Your School Name',
          schoolAddress: 'School Address',
          schoolPhone: '',
          schoolEmail: '',
          schoolLogo: '',
          bankDetails: {
            bankName: 'Your Bank',
            accountNumber: '1234567890',
            ifscCode: 'ABCD0123456',
            branch: 'Main Branch',
            accountHolderName: 'School Name'
          },
          schoolData: {
            name: 'Your School Name',
            address: 'School Address',
            phone: '',
            email: ''
          }
        }}
      />

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\:block, .print-chalan, .print-chalan * {
            visibility: visible;
          }
          .print-chalan {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          .break-after-page {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
};

export default ChalanPage;
