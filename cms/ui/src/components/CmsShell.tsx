import React from "react";

export default function CmsShell() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          Bebras <span>CMS</span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">Contenido</div>
          <div id="sidebar-content-tree" className="sidebar-content-tree">
            <div className="sidebar-tree-loading">Cargando contenido...</div>
          </div>

          <div className="sidebar-section">Sistema</div>
          <a className="sidebar-link" data-nav="/snapshots" href="/snapshots">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12,6 12,12 16,14"></polyline></svg>
            Respaldos
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" id="sidebar-user">
            <div className="avatar">A</div>
            <div className="info">
              <div className="name">Admin</div>
              <div className="email">admin@bebras.bo</div>
            </div>
          </div>
          <a className="sidebar-link" id="logout-btn" href="#" style={{ marginTop: "0.25rem", color: "var(--text-muted)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16,17 21,12 16,7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Cerrar sesion
          </a>
        </div>
      </aside>

      <header className="header">
        <div className="flex items-center gap-sm">
          <button className="btn btn-icon mobile-menu-btn" id="mobile-menu-btn" aria-label="Abrir menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <span id="header-context-actions" className="header-context-actions"></span>
          <div className="header-title" id="header-title">Contenido</div>
        </div>
        <div className="header-actions">
          <span id="header-editor-actions" className="header-editor-actions"></span>
          <button className="btn btn-primary btn-sm" id="header-publish-btn" aria-label="Publicar sitio">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><polyline points="16,16 12,12 8,16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path></svg>
            <span className="btn-text">Publicar sitio</span>
          </button>
        </div>
      </header>

      <div className="sidebar-overlay" id="sidebar-overlay"></div>

      <main className="main" id="main-content">
        <div className="loading-state">
          <div className="spinner"></div>
          Cargando...
        </div>
      </main>
    </div>
  );
}
