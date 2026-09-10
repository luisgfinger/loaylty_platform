import type { ReactNode } from 'react'
import { useAuth } from '../../auth/useAuth'
import { useTheme } from '../../theme/useTheme'

const items = [
  { label: 'Registrar compra', path: '/app/purchases/new', available: true, primary: true },
  { label: 'Clientes', path: '/app/customers', available: true, primary: false },
  { label: 'Histórico', path: '/app/purchases', available: true, primary: false },
  { label: 'Fidelidade', path: '/app/loyalty', available: true, primary: false },
  { label: 'Funcionários', path: '/app/employees', available: true, primary: false },
  { label: 'Empresa', path: '/app/company', available: true, primary: false },
]

interface Props {
  currentPath: string
  onNavigate: (path: string) => void
  children: ReactNode
}

export function AppLayout({ currentPath, onNavigate, children }: Props) {
  const { session, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const initial = session?.user.name.charAt(0).toUpperCase() ?? 'U'
  const brandName = 'Loyalty Platform'

  return <div className="app-shell">
    <aside className="sidebar" aria-label="Navegação principal">
      <a className="brand" href="/app/purchases/new" onClick={(event) => { event.preventDefault(); onNavigate('/app/purchases/new') }}>
        <span className="brand-mark" aria-hidden="true">{brandName.charAt(0)}</span><span>{brandName}</span>
      </a>
      <nav><p className="navigation-label">Operação</p><ul className="navigation-list">{items.map((item) => <li key={item.path}>{item.available ? <a className={`navigation-link${item.primary ? ' navigation-link--primary' : ''}${currentPath === item.path ? ' is-active' : ''}`} href={item.path} aria-current={currentPath === item.path ? 'page' : undefined} onClick={(event) => { event.preventDefault(); onNavigate(item.path) }}>{item.label}</a> : <span className="navigation-link is-unavailable" aria-disabled="true">{item.label}<small>Em breve</small></span>}</li>)}</ul></nav>
      <p className="sidebar-company"><strong>Loyalty Platform</strong><span>{session?.company.name}</span></p>
    </aside>
    <div className="app-content"><header className="app-header"><div><p className="eyebrow">Administração</p><p className="company-name">{session?.company.name}</p></div><div className="header-actions"><button type="button" className="icon-button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}>{theme === 'dark' ? '☀' : '◐'}</button><span className="user-avatar" aria-hidden="true">{initial}</span><button type="button" className="logout-button" onClick={logout}>Sair</button></div></header><main className="main-content">{children}</main></div>
  </div>
}
