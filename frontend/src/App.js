// frontend/src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

import CampaignPage from './pages/CampaignPage';
import DashboardPage from './pages/DashboardPage';
import DisparoPage from './pages/DisparoPage';
import HistoryPage from './pages/HistoryPage';
import SuggestionPage from './pages/SuggestionPage';
import TemplatePage from './pages/TemplatePage';
import UploadPage from './pages/UploadPage';

import JourneysPage from './pages/JourneysPage';
import JourneyBuilder from './pages/JourneyBuilder';
import TemplatesCompliancePage from './pages/TemplatesCompliancePage';
import RunsPage from './pages/RunsPage';
import TemplateStudio from './pages/TemplateStudio';

const App = () => {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex' }}>
        <nav>
          <Link to="/upload">Upload Base</Link>
          <Link to="/disparo">Disparar Campanha</Link>
          <Link to="/template">Criar Template</Link>
          <Link to="/templates/studio">Template Studio</Link>
          <Link to="/historico">Histórico</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/sugestoes">Sugestões de IA</Link>
          <Link to="/journeys">Journeys</Link>
          <Link to="/journeys/builder">Builder</Link>
          <Link to="/runs">Execuções</Link>
          <Link to="/templates/compliance">Template Compliance</Link>
        </nav>

        <div style={{ marginLeft: '180px', padding: '2rem', width: '100%' }}>
          <Routes>
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/disparo" element={<DisparoPage />} />
            <Route path="/template" element={<TemplatePage />} />
            <Route path="/historico" element={<HistoryPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/sugestoes" element={<SuggestionPage />} />
            <Route path="/campanha" element={<CampaignPage />} />

            {/* Journeys */}
            <Route path="/journeys" element={<JourneysPage />} />
            <Route path="/journeys/builder" element={<JourneyBuilder />} />
            <Route path="/runs" element={<RunsPage />} />
            <Route path="/templates/studio" element={<TemplateStudio />} />

            {/* Compliance */}
            <Route path="/templates/compliance" element={<TemplatesCompliancePage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;