import React, { useState } from "react";

interface Props {
  basePath?: string;
}

export default function LoginView({ basePath = "" }: Props) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="login-card">
      <div className="login-brand">
        <span className="login-logo-ring">
          <img src={`${basePath}/favicon.png`} alt="" className="login-logo" />
        </span>
        <p className="login-brand-name">
          <span>Bebras</span>
          <span>Bolivia</span>
        </p>
        <p className="login-brand-tag">Panel de administración</p>
      </div>

      <form id="login-form">
        <div className="form-group">
          <label htmlFor="email">Correo electrónico</label>
          <input type="email" id="email" className="form-input" placeholder="admin@bebras.bo" required autoComplete="email" autoFocus />
        </div>
        <div className="form-group">
          <label htmlFor="password">Contraseña</label>
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              className="form-input"
              placeholder="Tu contraseña"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
              )}
            </button>
          </div>
        </div>
        <label className="login-remember" htmlFor="remember-me">
          <input type="checkbox" id="remember-me" />
          Recuérdame en esta página
        </label>
        <div id="login-error" className="login-error" style={{ display: "none" }}></div>
        <button type="submit" className="btn btn-primary login-submit" id="login-btn">
          Ingresar
        </button>
      </form>
    </div>
  );
}
