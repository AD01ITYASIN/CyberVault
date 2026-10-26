
import { useEffect, useState } from 'react'
import Suspects from './Suspects'
import GraphExplorer from './GraphExplorer'
import Investigations from './Investigations'
import Evidence from './Evidence'
import DataManagement from './DataManagement'
import GraphAnalytics from './GraphAnalytics'

import {
  Shield,
  LayoutDashboard,
  Network,
  FolderSearch,
  Users,
  Database,
  FileSearch,
  Settings,
  Bell,
  ChevronDown,
  ArrowUpRight,
  Activity,
  Clock3,
  CircleDot,
  Menu,
  ChartNoAxesCombined,
} from 'lucide-react'

import './App.css'

const API_BASE = 'http://localhost:3001/api'

const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Graph Explorer', icon: Network },
  { label: 'Graph Analytics', icon: ChartNoAxesCombined },
  { label: 'Investigations', icon: FolderSearch },
  { label: 'Suspects', icon: Users },
  { label: 'Evidence', icon: FileSearch },
  { label: 'Data Management', icon: Database },
]

const modules = [
  {
    title: 'Graph Explorer',
    description: 'Explore suspects, cases, malware and organizational links.',
    icon: Network,
    code: 'GRAPH',
    page: 'Graph Explorer',
  },
  {
    title: 'Case Management',
    description: 'Review cases and follow their connected evidence.',
    icon: FolderSearch,
    code: 'CASES',
    page: 'Investigations',
  },
  {
    title: 'Suspect Registry',
    description: 'Search and manage suspect records.',
    icon: Users,
    code: 'ENTITIES',
    page: 'Suspects',
  },
  {
    title: 'Evidence Records',
    description: 'Inspect evidence metadata and case associations.',
    icon: FileSearch,
    code: 'EVIDENCE',
    page: 'Evidence',
  },
  {
    title: 'Data Management',
    description: 'Create, review, update and remove database records.',
    icon: Database,
    code: 'CRUD',
    page: 'Data Management',
  },
  {
    title: 'Graph Analytics',
    description: 'Investigate shortest paths and graph connectivity.',
    icon: ChartNoAxesCombined,
    code: 'ANALYTICS',
    page: 'Graph Analytics',
  },
]

function App() {
  const [activePage, setActivePage] = useState('Overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dbHealth, setDbHealth] = useState(null)
  const [dbError, setDbError] = useState('')

  useEffect(() => {
    let active = true

    async function loadHealth() {
      try {
        const response = await fetch(`${API_BASE}/health`)

        if (!response.ok) {
          throw new Error('Connection check failed')
        }

        const data = await response.json()

        if (active) {
          setDbHealth(data)
          setDbError('')
        }
      } catch {
        if (active) {
          setDbHealth(null)
          setDbError('Unable to reach the backend API.')
        }
      }
    }

    loadHealth()

    const interval = setInterval(loadHealth, 15000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  const connected = dbHealth?.status === 'connected'

  function navigateTo(page) {
    setActivePage(page)
    setSidebarOpen(false)
  }

  function renderPage() {
    switch (activePage) {
      case 'Graph Explorer':
        return <GraphExplorer />

      case 'Graph Analytics':
        return <GraphAnalytics />

      case 'Investigations':
      case 'Case Management':
        return <Investigations />

      case 'Suspects':
      case 'Suspect Registry':
        return <Suspects />

      case 'Evidence':
        return <Evidence />

      case 'Data Management':
        return <DataManagement />

      case 'Overview':
        return (
          <>
            <section className="notice-panel">
              <div className="notice-icon">
                <Database size={20} />
              </div>

              <div className="notice-copy">
                <strong>
                  {connected
                    ? 'Neo4j database connected'
                    : dbError || 'Checking database connection...'}
                </strong>

                <p>
                  {connected
                    ? `Connected to ${dbHealth.database}. Counts below are retrieved from your live database.`
                    : 'Start the backend server and ensure the Neo4j database is running.'}
                </p>
              </div>

              <span className="notice-tag">
                {connected ? 'CONNECTED' : 'NOT CONNECTED'}
              </span>
            </section>

            <section className="live-stats">
              <div className="stat-card">
                <span>Total nodes</span>
                <strong>
                  {dbHealth ? dbHealth.nodes.toLocaleString() : '—'}
                </strong>
                <small>Across all node labels</small>
              </div>

              <div className="stat-card">
                <span>Total relationships</span>
                <strong>
                  {dbHealth
                    ? dbHealth.relationships.toLocaleString()
                    : '—'}
                </strong>
                <small>Stored graph relationships</small>
              </div>

              <div className="stat-card">
                <span>Database</span>
                <strong>{dbHealth?.database || '—'}</strong>
                <small>
                  {connected
                    ? 'Connection verified'
                    : 'Awaiting connection'}
                </small>
              </div>
            </section>

            <section className="section-heading">
              <div>
                <h2>Workspace modules</h2>
                <p>Investigation tools</p>
              </div>

              <span className="module-count">06 MODULES</span>
            </section>

            <section className="module-grid">
              {modules.map(({ title, description, icon: Icon, code, page }) => (
                <button
                  className="module-card"
                  key={title}
                  type="button"
                  onClick={() => navigateTo(page)}
                >
                  <div className="module-card-top">
                    <div className="module-icon">
                      <Icon size={20} strokeWidth={1.7} />
                    </div>

                    <ArrowUpRight size={17} className="card-arrow" />
                  </div>

                  <div className="module-code">{code}</div>
                  <h3>{title}</h3>
                  <p>{description}</p>

                  <div className="module-card-footer">
                    <span>
                      <CircleDot size={13} />
                      {connected
                        ? 'Database connected'
                        : 'Connection pending'}
                    </span>

                    <span>
                      Open <ArrowUpRight size={13} />
                    </span>
                  </div>
                </button>
              ))}
            </section>

            <section className="activity-panel">
              <div className="section-heading activity-heading">
                <div>
                  <h2>System status</h2>
                  <p>Current application services</p>
                </div>

                <Clock3 size={18} />
              </div>

              <div className="activity-row">
                <div className="activity-symbol">
                  <Database size={17} />
                </div>

                <div className="activity-text">
                  <strong>Neo4j database</strong>
                  <span>
                    {connected
                      ? `${dbHealth.nodes.toLocaleString()} nodes and ${dbHealth.relationships.toLocaleString()} relationships`
                      : dbError || 'Waiting for backend response'}
                  </span>
                </div>

                <span className="activity-status">
                  {connected ? 'Connected' : 'Offline'}
                </span>
              </div>

              <div className="activity-row">
                <div className="activity-symbol">
                  <Network size={17} />
                </div>

                <div className="activity-text">
                  <strong>Interactive graph</strong>
                  <span>
                    Open Graph Explorer to view connected entities.
                  </span>
                </div>

                <span className="activity-status">Available</span>
              </div>
            </section>

            <footer className="footer">
              <span>CYBERVAULT</span>
              <span>
                Local development environment ·{' '}
                {connected
                  ? 'Live database connected'
                  : 'No live database connection'}
              </span>
            </footer>
          </>
        )

      case 'Settings':
        return (
          <section className="notice-panel">
            <div className="notice-icon">
              <Settings size={20} />
            </div>

            <div className="notice-copy">
              <strong>Settings</strong>
              <p>
                CyberVault is running in its local development environment.
              </p>
            </div>
          </section>
        )

      default:
        return (
          <section className="notice-panel">
            <div className="notice-icon">
              <Database size={20} />
            </div>

            <div className="notice-copy">
              <strong>{activePage}</strong>
              <p>This workspace module is not connected yet.</p>
            </div>
          </section>
        )
    }
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Shield size={22} />
          </div>

          <div>
            <div className="brand-name">CyberVault</div>
            <div className="brand-subtitle">
              INVESTIGATION PLATFORM
            </div>
          </div>
        </div>

        <div className="nav-heading">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className={`nav-item ${
                activePage === label ? 'active' : ''
              }`}
              onClick={() => navigateTo(label)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>

              {activePage === label && (
                <span className="active-indicator" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="connection-label">
            <span
              className="status-dot"
              style={{
                background: connected ? '#65c7bb' : '#c49b5b',
              }}
            />

            <span>
              {connected ? 'Database online' : 'Database unavailable'}
            </span>
          </div>

          <div className="database-label">
            <Database size={16} />
            <span>{dbHealth?.database || 'Neo4j connection'}</span>
          </div>

          <button
            type="button"
            className={`nav-item settings-item ${
              activePage === 'Settings' ? 'active' : ''
            }`}
            onClick={() => navigateTo('Settings')}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>

          <div className="version-label">
            CYBERVAULT · DEVELOPMENT
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button
            type="button"
            className="icon-button mobile-menu"
            onClick={() => setSidebarOpen(open => !open)}
            aria-label="Toggle navigation"
          >
            <Menu size={20} />
          </button>

          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{activePage}</strong>
          </div>

          <div className="topbar-right">
            <div className="environment">
              <span
                className="status-dot"
                style={{
                  background: connected ? '#65c7bb' : '#c49b5b',
                }}
              />

              {connected ? 'CONNECTED' : 'OFFLINE'}
            </div>

            <button
              type="button"
              className="icon-button"
              aria-label="Activity"
              onClick={() => navigateTo('Overview')}
            >
              <Bell size={18} />
            </button>

            <div className="user-chip">
              <div className="user-avatar">CV</div>
              <span>Analyst</span>
              <ChevronDown size={15} />
            </div>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow">
                CYBERVAULT / WORKSPACE
              </div>

              <h1>
                {activePage === 'Overview'
                  ? 'Investigation overview'
                  : activePage}
              </h1>

              <p>
                {activePage === 'Overview'
                  ? 'Review investigation data and explore connected entities.'
                  : `Explore ${activePage.toLowerCase()} within the CyberVault workspace.`}
              </p>
            </div>

            <div className="heading-meta">
              <span
                className="status-dot"
                style={{
                  background: connected ? '#65c7bb' : '#c49b5b',
                }}
              />

              {connected
                ? 'Live database connection'
                : 'Connection unavailable'}
            </div>
          </section>

          {renderPage()}
        </div>
      </main>
    </div>
  )
}

export default App
