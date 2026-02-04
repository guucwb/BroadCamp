import React from 'react';

const DashboardPage = () => {
  return (
    <div className="page-content">
      <h2>Dashboard</h2>
      <p style={{ color: '#666', fontSize: '0.95rem' }}>
        Bem-vindo ao painel principal. Aqui você verá um resumo das campanhas, templates e interações.
      </p>

      <div className="card-grid">
        <div className="card">
          <h3>Campanhas</h3>
          <p>Veja o status das campanhas ativas e passadas.</p>
        </div>
        <div className="card">
          <h3>Templates</h3>
          <p>Gerencie e acompanhe o uso dos templates.</p>
        </div>
        <div className="card">
          <h3>Disparos</h3>
          <p>Acompanhe os envios realizados e os agendamentos.</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

