import React from 'react';
import LogoDisplay from '../../components/LogoDisplay';

const TestLogoPage = () => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <h1 style={{ marginBottom: '30px', color: '#333' }}>Logo Display Test Page</h1>
      <LogoDisplay />
      
      <div style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        maxWidth: '600px',
        width: '100%'
      }}>
        <h3>Testing Instructions:</h3>
        <ol>
          <li>The logo above should display if the file exists at the specified path.</li>
          <li>If the logo doesn't appear, check the browser's console for any errors.</li>
          <li>Verify that the file exists in your public directory.</li>
          <li>Make sure the path in the LogoDisplay component matches the actual file location.</li>
        </ol>
        
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <h4>Current Logo Path:</h4>
          <code>/White green minimalist education knowledge logo copy.png</code>
        </div>
      </div>
    </div>
  );
};

export default TestLogoPage;
