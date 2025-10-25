import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chalan } from '../../types/chalan';
import ChalanList from '../../components/chalan/ChalanList';
import ChalanGenerationForm from '../../components/chalan/ChalanGenerationForm';
import ChalanView from '../../components/chalan/ChalanView';
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
    setViewChalan(chalan);
  };

  const handlePrintChalan = (chalan: Chalan) => {
    setViewChalan(chalan);
    setPrintMode(true);
    // This will be handled by the browser's print functionality
    setTimeout(() => {
      window.print();
      setPrintMode(false);
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
      {viewChalan && (
        <div className={`fixed inset-0 z-50 overflow-y-auto ${printMode ? 'block' : 'flex items-center justify-center p-4'}`}>
          <div className={`bg-white rounded-lg shadow-xl ${printMode ? 'w-full h-full p-4' : 'w-full max-w-4xl'}`}>
            {!printMode && (
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-xl font-semibold">Chalan Details</h2>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handlePrintChalan(viewChalan)}
                    className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                  >
                    <PrinterIcon className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                  <Button
                    onClick={handleCloseView}
                    className="text-gray-500 hover:text-gray-700"
                    variant="ghost"
                  >
                    <XIcon className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}
            <div className="p-4">
              {!printMode ? (
                <ChalanView chalan={viewChalan} />
              ) : (
                <>
                  {/* Print all three copies */}
                  <div className="space-y-8">
                    <ChalanView chalan={viewChalan} copyType="student" className="mb-8" />
                    <div className="break-after-page">
                      <ChalanView chalan={viewChalan} copyType="office" className="mb-8" />
                    </div>
                    <ChalanView chalan={viewChalan} copyType="admin" />
                  </div>
                  
                  {/* Print button for print view */}
                  <div className="hidden print:block text-center mt-8">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md"
                    >
                      Print All Copies
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
