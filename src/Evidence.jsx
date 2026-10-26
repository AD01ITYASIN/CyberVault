
import { useCallback, useEffect, useState } from 'react'
import {
  Search,
  RefreshCw,
  FileSearch,
  X,
  ShieldCheck,
  FileText,
  ChevronRight,
} from 'lucide-react'
import './Evidence.css'

const API = 'http://localhost:3001/api'

function displayValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not recorded'
  }
  return String(value)
}

export default function Evidence() {
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const loadEvidence = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API}/evidence?search=${encodeURIComponent(search.trim())}`
      )
      const raw = await response.text()

      let data
      try {
        data = JSON.parse(raw)
      } catch {
        throw new Error('The evidence API did not return JSON.')
      }

      if (!response.ok) {
        throw new Error(data.error || 'Could not load evidence records.')
      }

      setRecords(Array.isArray(data.evidence) ? data.evidence : [])
    } catch (err) {
      setRecords([])
      setError(err.message || 'Unable to connect to the backend.')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(loadEvidence, 250)
    return () => clearTimeout(timer)
  }, [loadEvidence, refreshKey])

  const types = [
    ...new Set(records.map(item => item.type).filter(Boolean)),
  ]

  const [typeFilter, setTypeFilter] = useState('All')

  const filteredRecords = records.filter(item => {
    return typeFilter === 'All' || item.type === typeFilter
  })

  return (
    <section className="evidence-page">
      <div className="evidence-toolbar">
        <div>
          <h2>Evidence Registry</h2>
          <p>Review evidence metadata returned by the Neo4j database.</p>
        </div>

        <button
          type="button"
          className="evidence-refresh"
          onClick={() => setRefreshKey(value => value + 1)}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'evidence-spin' : ''} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="evidence-summary">
        <div className="evidence-summary-icon">
          <FileSearch size={21} />
        </div>
        <div>
          <span>Records returned</span>
          <strong>{records.length}</strong>
        </div>
        <div className="evidence-summary-note">
          <ShieldCheck size={16} />
          Live database records
        </div>
      </div>

      <div className="evidence-filters">
        <label className="evidence-search">
          <Search size={17} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search evidence ID, name, type..."
            aria-label="Search evidence records"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </label>

        <select
          value={typeFilter}
          onChange={event => setTypeFilter(event.target.value)}
          aria-label="Filter by evidence type"
        >
          <option value="All">All evidence types</option>
          {types.map(type => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="evidence-error" role="alert">
          <strong>Unable to load evidence</strong>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRefreshKey(value => value + 1)}
          >
            Retry
          </button>
        </div>
      )}

      <div className="evidence-results-heading">
        <div>
          <h3>Evidence records</h3>
          <p>Click a record to inspect its available properties.</p>
        </div>
        <span>{filteredRecords.length} shown</span>
      </div>

      <div className="evidence-table-wrap">
        <table className="evidence-table">
          <thead>
            <tr>
              <th>Evidence</th>
              <th>Type</th>
              <th>Description</th>
              <th>Record details</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="evidence-empty">
                  Loading evidence records...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={4} className="evidence-empty">
                  <FileSearch size={26} />
                  <strong>No matching records</strong>
                  <span>Try a different search term or type.</span>
                </td>
              </tr>
            ) : (
              filteredRecords.map((item, index) => (
                <tr
                  key={item.evidence_id || index}
                  onClick={() => setSelected(item)}
                >
                  <td>
                    <div className="evidence-name-cell">
                      <div className="evidence-record-icon">
                        <FileText size={17} />
                      </div>
                      <div>
                        <strong>
                          {displayValue(item.name || item.title)}
                        </strong>
                        <small>{displayValue(item.evidence_id)}</small>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className="evidence-type">
                      {displayValue(item.type)}
                    </span>
                  </td>

                  <td className="evidence-description">
                    {displayValue(item.description)}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="evidence-open"
                      onClick={event => {
                        event.stopPropagation()
                        setSelected(item)
                      }}
                      aria-label="View evidence details"
                    >
                      Inspect <ChevronRight size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="evidence-modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              setSelected(null)
            }
          }}
        >
          <section
            className="evidence-detail-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="evidence-detail-title"
          >
            <div className="evidence-detail-header">
              <div>
                <span className="evidence-eyebrow">EVIDENCE RECORD</span>
                <h3 id="evidence-detail-title">
                  {displayValue(selected.name || selected.title)}
                </h3>
                <p>{displayValue(selected.evidence_id)}</p>
              </div>

              <button
                type="button"
                className="evidence-close"
                onClick={() => setSelected(null)}
                aria-label="Close evidence details"
              >
                <X size={19} />
              </button>
            </div>

            <div className="evidence-detail-section">
              <h4>Description</h4>
              <p>{displayValue(selected.description)}</p>
            </div>

            <div className="evidence-detail-properties">
              {Object.entries(selected.properties || {}).map(([key, value]) => (
                <div className="evidence-property" key={key}>
                  <span>{key.replaceAll('_', ' ')}</span>
                  <strong>{displayValue(value)}</strong>
                </div>
              ))}

              {!selected.properties && (
                <>
                  <div className="evidence-property">
                    <span>Evidence ID</span>
                    <strong>{displayValue(selected.evidence_id)}</strong>
                  </div>
                  <div className="evidence-property">
                    <span>Type</span>
                    <strong>{displayValue(selected.type)}</strong>
                  </div>
                </>
              )}
            </div>

            <p className="evidence-detail-note">
              This panel displays the evidence fields currently returned by
              the backend. Use Graph Explorer to investigate connected entities.
            </p>
          </section>
        </div>
      )}
    </section>
  )
}
