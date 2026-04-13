import React from "react";

export default function LoginView() {
  return (
    <div className="login-card">
      <div className="brand">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        Bebras <span>CMS</span>
      </div>
      <h1>Iniciar sesion</h1>
      <p className="subtitle">Ingresa tus credenciales para acceder al panel</p>

      <form id="login-form">
        <div className="form-group">
          <label htmlFor="email">Correo electronico</label>
          <input type="email" id="email" className="form-input" placeholder="admin@bebras.bo" required autoComplete="email" autoFocus />
        </div>
        <div className="form-group">
          <label htmlFor="password">Contrasena</label>
          <input type="password" id="password" className="form-input" placeholder="........" required autoComplete="current-password" />
        </div>
        <div id="login-error" style={{ color: "var(--danger)", fontSize: "0.8125rem", marginBottom: "0.75rem", display: "none" }}></div>
        <button type="submit" className="btn btn-primary" style={{ width: "100%" }} id="login-btn">
          Ingresar
        </button>
      </form>
    </div>
  );
}
