import React from 'react';
import Papa from 'papaparse';

function UploadCSV({ onDataParsed }) {
  const handleFileUpload = (e) => {
    Papa.parse(e.target.files[0], {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        onDataParsed(results.data);
      }
    });
  };

  return (
    <div className="p-4 border rounded-xl shadow">
      <label className="block mb-2 text-sm font-medium text-gray-700">Upload CSV</label>
      <input type="file" accept=".csv,.txt" onChange={handleFileUpload} />
    </div>
  );
}

export default UploadCSV;
