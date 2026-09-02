function LoginScreen({ credentials, onChange, onSubmit, error }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/logo-remanso.avif" alt="Logo Remanso" className="login-logo" />
          <h1>Remanso</h1>
          <p>Acesso restrito</p>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          <label htmlFor="username">Usuário</label>
          <input
            id="username"
            type="text"
            value={credentials.username}
            onChange={(e) => onChange('username', e.target.value)}
            placeholder="Digite o usuário"
            autoComplete="username"
            required
          />

          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            value={credentials.password}
            onChange={(e) => onChange('password', e.target.value)}
            placeholder="Digite a senha"
            autoComplete="current-password"
            required
          />

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-button">Entrar</button>
        </form>
      </div>
    </div>
  );
}

export default LoginScreen;
