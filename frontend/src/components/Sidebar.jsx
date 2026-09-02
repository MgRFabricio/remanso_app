function Sidebar({ menuItems, activeModule, setActiveModule, onLogout, currentUser }) {
  return (
    <aside className="sidebar">
      <div className="brand-box">
        <div className="brand-logo">R</div>
        <div>
          <h2>Remanso</h2>
          <span>{currentUser?.nome || currentUser?.username || 'Usuário'}</span>
        </div>
      </div>

      <nav className="nav-menu">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={activeModule === item.id ? 'nav-item active' : 'nav-item'}
            type="button"
            onClick={() => setActiveModule(item.id)}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="secondary-button full-width" onClick={onLogout} type="button">Sair</button>
      </div>
    </aside>
  );
}

export default Sidebar;
