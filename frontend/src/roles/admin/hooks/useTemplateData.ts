import { useState, useEffect } from 'react';

interface TemplateSettings {
  schoolName: string;
  schoolCode: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  headerColor: string;
  accentColor: string;
}

export const useTemplateData = () => {
  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>({
    schoolName: 'School Name',
    schoolCode: 'SCH001',
    address: '123 School Street, City, State 12345',
    phone: '+91 9876543210',
    email: 'info@school.edu',
    website: 'www.school.edu',
    logoUrl: '',
    headerColor: '#2563eb',
    accentColor: '#3b82f6'
  });

  useEffect(() => {
    // Load saved template data from localStorage
    const savedTemplate = localStorage.getItem('erp.templateSettings');
    if (savedTemplate) {
      try {
        const templateData = JSON.parse(savedTemplate);
        setTemplateSettings(prev => ({ ...prev, ...templateData }));
      } catch (e) {
        console.log('Failed to parse saved template data:', e);
      }
    }
  }, []);

  const updateTemplateSettings = (newSettings: Partial<TemplateSettings>) => {
    const updatedSettings = { ...templateSettings, ...newSettings };
    setTemplateSettings(updatedSettings);
    localStorage.setItem('erp.templateSettings', JSON.stringify(updatedSettings));
  };

  return {
    templateSettings,
    updateTemplateSettings
  };
};
