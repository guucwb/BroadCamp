import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';

import ThemeProvider from './theme/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

import LoginPage from './pages/LoginPage';
import CampaignPage from './pages/CampaignPage';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
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
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SnackbarProvider
            maxSnack={3}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            autoHideDuration={4000}
          >
            <Routes>
              {/* Rota pública de login */}
              <Route path="/login" element={<LoginPage />} />

              {/* Rotas protegidas */}
              <Route
                path="/*"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/disparo" element={<DisparoPage />} />
                        <Route path="/template" element={<TemplatePage />} />
                        <Route path="/campaign" element={<CampaignPage />} />
                        <Route path="/upload" element={<UploadPage />} />
                        <Route path="/historico" element={<HistoryPage />} />
                        <Route path="/sugestoes" element={<SuggestionPage />} />
                        <Route path="/journeys" element={<JourneysPage />} />
                        <Route path="/journeys/builder" element={<JourneyBuilder />} />
                        <Route path="/runs" element={<RunsPage />} />
                        <Route path="/templates/studio" element={<TemplateStudio />} />
                        <Route path="/templates/compliance" element={<TemplatesCompliancePage />} />
                        <Route path="/analytics" element={<AnalyticsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/users" element={<UsersPage />} />
                      </Routes>
                    </Layout>
                  </PrivateRoute>
                }
              />
            </Routes>
          </SnackbarProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
