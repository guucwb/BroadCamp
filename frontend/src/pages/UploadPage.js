// src/pages/UploadPage.js

import React, { useState } from 'react';
import axios from 'axios';
import '../styles/theme.css';

function UploadPage() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [uploadedData, setUploadedData] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
    setUploadedData(null);
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Selecione um arquivo para upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://localhost:3001/api/campaign/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage('Upload realizado com sucesso!');
      setUploadedData(res.data.data);
    } catch (error) {
      console.error(error);
      setMessage('Erro ao fazer upload.');
    }
  };

  return (
    <div className="page-content">
      <h2>Upload da Base</h2>
      <div className="form-group" style={{ maxWidth: '600px' }}>
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleUpload}>Fazer Upload</button>
        {message && <p style={{ marginTop: '1rem', fontWeight: 500 }}>{message}</p>}
      </div>

      {uploadedData && (
        <div className="upload-preview">
          <strong>Prévia da Base:</strong>
          <pre>{JSON.stringify(uploadedData.slice(0, 5), null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default UploadPage;

