
import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  RefreshCw,
  FolderSearch,
  X,
  CalendarDays,
  ShieldAlert,
  FileText,
  ChevronRight,
} from 'lucide-react'

import './Investigations.css'

const API = 'http://localhost:3001/api'

function displayValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not recorded'
  }

  return String(value)
}

export default function Investigations() {
  const [cases, setCases] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [severityFilter, setSeverityFilter] = useState('All')
  const [selectedCase, setSelectedCase] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const loadCases = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API}/cases`)
      const raw = await response.text()

      let data
      try {
        data = JSON.parse(raw)
      } catch {
        throw new Error(
          'The cases API did not return JSON. Check the backend endpoint.'
        )
      }

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load investigation cases.')
      }

      const records = Array.isArray(data.cases) ? data.cases : []
      setCases(records)
    } catch (err) {
      setCases([])
      setError(err.message || 'Unable to connect to the backend.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCases()
  }, [loadCases, refreshKey])

  const statuses = [
    'All',
    ...new Set(cases.map(item => item.status).filter(Boolean)),
  ]

  const severities = [
    'All',
    ...new Set(cases.map(item => item.severity).filter(Boolean)),
  ]

  const filteredCases = cases.filter(item => {
    const query = search.trim().toLowerCase()

    const matchesSearch =
      !query ||
      [
        item.case_id,
        item.title,
        item.description,
        item.status,
        item.severity,
      ].some(value => String(value || '').toLowerCase().includes(query))

    const matchesStatus =
      statusFilter === 'All' || item.status === statusFilter

    const matchesSeverity =
      severityFilter === 'All' || item.severity === severityFilter

    return matchesSearch && matchesStatus && matchesSeverity
  })

  const openCases = cases.filter(
    item => String(item.status || '').toLowerCase() === 'open'
  ).length

  const highSeverityCases = cases.filter(
    item => String(item.severity || '').toLowerCase() === 'high'
  ).length

  function severityClass(severity) {
    const value = String(severity || '').toLowerCase()

    if (value === 'high' || value === 'critical') return 'severity-high'
    if (value === 'medium') return 'severity-medium'
    if (value === 'low') return 'severity-low'

    return 'severity-unknown'
  }

  return (
    <section className="investigations-page">
      <div className="investigations-toolbar">
        <div>
          <h2>Investigation cases</h2>
          <p>
            Review cases and inspect their recorded investigation details.
          </p>
        </div>

        <button
          type="button"
          className="investigations-refresh"
          onClick={() => setRefreshKey(value => value + 1)}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="investigation-stats">
        <article className="investigation-stat">
          <div className="investigation-stat-icon">
            <FolderSearch size={19} />
          </div>
          <div>
            <span>Total cases</span>
            <strong>{cases.length}</strong>
          </div>
        </article>

        <article className="investigation-stat">
          <div className="investigation-stat-icon">
            <FileText size={19} />
          </div>
          <div>
            <span>Open cases</span>
            <strong>{openCases}</strong>
          </div>
        </article>

        <article className="investigation-stat">
          <div className="investigation-stat-icon">
            <ShieldAlert size={19} />
          </div>
          <div>
            <span>High severity</span>
            <strong>{highSeverityCases}</strong>
          </div>
        </article>
      </div>

      <div className="investigation-filters">
        <label className="investigation-search">
          <Search size={17} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search case ID, title, description..."
            aria-label="Search investigation cases"
          />
          {search && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </label>

        <select
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value)}
          aria-label="Filter by case status"
        >
          {statuses.map(status => (
            <option value={status} key={status}>
              {status === 'All' ? 'All statuses' : status}
            </option>
          ))}
        </select>

        <select
          value={severityFilter}
          onChange={event => setSeverityFilter(event.target.value)}
          aria-label="Filter by severity"
        >
          {severities.map(severity => (
            <option value={severity} key={severity}>
              {severity === 'All' ? 'All severities' : severity}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="investigation-error" role="alert">
          <ShieldAlert size={18} />
          <div>
            <strong>Unable to load cases</strong>
            <p>{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey(value => value + 1)}
          >
            Retry
          </button>
        </div>
      )}

      <div className="investigation-results-heading">
        <div>
          <h3>Case register</h3>
          <p>Cases returned by the connected Neo4j database.</p>
        </div>
        <span>{filteredCases.length} shown</span>
      </div>

      <div className="investigation-table-wrap">
        <table className="investigation-table">
          <thead>
            <tr>
              <th>Case</th>
              <th>Description</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Date opened</th>
              <th aria-label="View case" />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="investigation-empty">
                  Loading cases from Neo4j...
                </td>
              </tr>
            ) : filteredCases.length === 0 ? (
              <tr>
                <td colSpan={6} className="investigation-empty">
                  <FolderSearch size={25} />
                  <strong>No matching cases</strong>
                  <span>Try changing the search or filters.</span>
                </td>
              </tr>
            ) : (
              filteredCases.map((item, index) => (
                <tr
                  key={item.case_id || item.elementId || index}
                  className={
                    selectedCase?.case_id === item.case_id
                      ? 'investigation-row-selected'
                      : ''
                  }
                  onClick={() => setSelectedCase(item)}
                >
                  <td>
                    <div className="case-title-cell">
                      <span className="case-index">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <strong>{displayValue(item.title)}</strong>
                        <small>{displayValue(item.case_id)}</small>
                      </div>
                    </div>
                  </td>

                  <td className="case-description">
                    {displayValue(item.description)}
                  </td>

                  <td>
                    <span
                      className={`severity-badge ${severityClass(item.severity)}`}
                    >
                      {displayValue(item.severity)}
                    </span>
                  </td>

                  <td>
                    <span className="case-status">
                      <i />
                      {displayValue(item.status)}
                    </span>
                  </td>

                  <td>
                    <span className="case-date">
                      <CalendarDays size={14} />
                      {displayValue(item.date_opened)}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="case-open-button"
                      aria-label={`View ${item.case_id || 'case'}`}
                      onClick={event => {
                        event.stopPropagation()
                        setSelectedCase(item)
                      }}
                    >
                      <ChevronRight size={17} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedCase && (
        <div
          className="case-modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              setSelectedCase(null)
            }
          }}
        >
          <section
            className="case-detail-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="case-detail-title"
          >
            <div className="case-detail-header">
              <div>
                <span className="case-detail-eyebrow">
                  INVESTIGATION RECORD
                </span>
                <h3 id="case-detail-title">
                  {displayValue(selectedCase.title)}
                </h3>
                <p>{displayValue(selectedCase.case_id)}</p>
              </div>

              <button
                type="button"
                className="case-close-button"
                onClick={() => setSelectedCase(null)}
                aria-label="Close case details"
              >
                <X size={19} />
              </button>
            </div>

            <div className="case-detail-badges">
              <span
                className={`severity-badge ${severityClass(selectedCase.severity)}`}
              >
                {displayValue(selectedCase.severity)} severity
              </span>
              <span className="case-status">
                <i />
                {displayValue(selectedCase.status)}
              </span>
            </div>

            <div className="case-detail-section">
              <h4>Description</h4>
              <p>{displayValue(selectedCase.description)}</p>
            </div>

            <div className="case-detail-properties">
              {Object.entries(selectedCase.properties || {}).map(
                ([key, value]) => (
                  <div className="case-detail-property" key={key}>
                    <span>{key.replaceAll('_', ' ')}</span>
                    <strong>{displayValue(value)}</strong>
                  </div>
                )
              )}

              {!selectedCase.properties && (
                <>
                  <div className="case-detail-property">
                    <span>Case ID</span>
                    <strong>{displayValue(selectedCase.case_id)}</strong>
                  </div>
                  <div className="case-detail-property">
                    <span>Date opened</span>
                    <strong>{displayValue(selectedCase.date_opened)}</strong>
                  </div>
                </>
              )}
            </div>

            <p className="case-detail-note">
              This view displays the case properties returned by the API.
              Related entities can be explored in Graph Explorer.
            </p>
          </section>
        </div>
      )}
    </section>
  )
}
