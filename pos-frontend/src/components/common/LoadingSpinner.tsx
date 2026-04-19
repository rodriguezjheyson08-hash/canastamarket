import React from 'react';

const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => (
  <div style={{ textAlign: 'center', marginTop: 40 }}>
    <div className="spinner" style={{ margin: '0 auto', width: 40, height: 40, border: '4px solid #1976d2', borderTop: '4px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    {message && <div style={{ marginTop: 16 }}>{message}</div>}
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

export default LoadingSpinner; 