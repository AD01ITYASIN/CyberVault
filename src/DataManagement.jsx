
import { useEffect, useState } from 'react'
import {
  Database,
  RefreshCw,
  Search,
  ChevronRight,
  CircleDot,
} from 'lucide-react'

const API = 'https://cyber-vault-pu6h.vercel.app/api'

const LABEL_DETAILS = {
  Case: 'Investigation case records',
  Evidence: 'Forensic and digital evidence',
  IOC: 'Indicators of compromise',
  Location: 'Locations associated with investigations',
  Malware: 'Malware and threat software records',
  Officer: 'Assigned investigation officers',
  Organization: 'Organizations connected to cases',
  Suspect: 'Registered suspect records',
}

export default function DataManagement() {
  const [summary, setSummary] = useState(null)
  const [selectedLabel, setSelectedLabel] = useState('')
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadSummary() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`${API}/data-management/summary`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load database summary.')
        }

        if (!cancelled) {
          setSummary(data)

          if (!selectedLabel && data.labels?.length) {
            setSelectedLabel(data.labels[0].label)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to connect to the backend.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSummary()

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  useEffect(() => {
    if (!selectedLabel) {
      setRecords([])
      return
    }

    let cancelled = false

    async function loadRecords() {
      setRecordsLoading(true)

      try {
        const response = await fetch(
          `${API}/data-management/records?label=${encodeURIComponent(selectedLabel)}`
        )
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load records.')
        }

        if (!cancelled) {
          setRecords(data.records || [])
        }
      } catch (err) {
        if (!cancelled) {
          setRecords([])
          setError(err.message || 'Unable to load records.')
        }
      } finally {
        if (!cancelled) setRecordsLoading(false)
      }
    }

    loadRecords()

    return () => {
      cancelled = true
    }
  }, [selectedLabel, refreshKey])

  const filteredRecords = records.filter(record => {
    const text = JSON.stringify(record).toLowerCase()
    return text.includes(search.trim().toLowerCase())
  })

  return (
    <section className="data-management-page">
      <div className="dm-heading">
        <div>
          <h2>Data Management</h2>
          <p>
            Inspect node labels and records stored in your Neo4j database.
          </p>
        </div>

        <button
          type="button"
          className="dm-refresh"
          onClick={() => setRefreshKey(value => value + 1)}
          disabled={loading || recordsLoading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && <div className="dm-error">{error}</div>}

      <div className="dm-summary-grid">
        <article className="dm-summary-card">
          <Database size={20} />
          <span>Database</span>
          <strong>{summary?.database || '—'}</strong>
        </article>

        <article className="dm-summary-card">
          <CircleDot size={20} />
          <span>Total nodes</span>
          <strong>
            {summary ? summary.totalNodes.toLocaleString() : '—'}
          </strong>
        </article>

        <article className="dm-summary-card">
          <Database size={20} />
          <span>Node labels</span>
          <strong>{summary?.labels?.length ?? '—'}</strong>
        </article>
      </div>

      <div className="dm-content">
        <aside className="dm-label-panel">
          <h3>Node labels</h3>
          <p>Select a label to inspect its records.</p>

          {loading ? (
            <div className="dm-muted">Loading labels...</div>
          ) : (
            <div className="dm-label-list">
              {(summary?.labels || []).map(item => (
                <button
                  type="button"
                  key={item.label}
                  className={`dm-label-item ${
                    selectedLabel === item.label ? 'selected' : ''
                  }`}
                  onClick={() => {
                    setSelectedLabel(item.label)
                    setSearch('')
                    setError('')
                  }}
                >
                  <div>
                    <strong>{item.label}</strong>
                    <small>
                      {LABEL_DETAILS[item.label] || 'Database records'}
                    </small>
                  </div>

                  <span className="dm-label-count">{item.count}</span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="dm-record-panel">
          <div className="dm-record-heading">
            <div>
              <span className="dm-eyebrow">SELECTED LABEL</span>
              <h3>{selectedLabel || 'Records'}</h3>
              <p>
                {LABEL_DETAILS[selectedLabel] || 'Stored graph records'}
              </p>
            </div>

            <span className="dm-record-count">
              {filteredRecords.length} shown
            </span>
          </div>

          <div className="dm-search">
            <Search size={17} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search record properties..."
              aria-label="Search database records"
            />
          </div>

          {recordsLoading ? (
            <div className="dm-empty">Loading records...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="dm-empty">
              No records found for this label or search.
            </div>
          ) : (
            <div className="dm-record-list">
              {filteredRecords.map((record, index) => (
                <article
                  className="dm-record-card"
                  key={record.elementId || `${selectedLabel}-${index}`}
                >
                  <div className="dm-record-card-heading">
                    <span className="dm-record-index">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <strong>
                      {record.name ||
                        record.title ||
                        record.suspect_id ||
                        record.case_id ||
                        record.evidence_id ||
                        record.malware_id ||
                        record.ioc_id ||
                        record.officer_id ||
                        record.location_id ||
                        record.org_id ||
                        `Record ${index + 1}`}
                    </strong>

                    <span className="dm-record-label">
                      {selectedLabel}
                    </span>
                  </div>

                  <div className="dm-properties">
                    {Object.entries(record)
                      .filter(([key]) => key !== 'elementId')
                      .slice(0, 8)
                      .map(([key, value]) => (
                        <div className="dm-property" key={key}>
                          <span>{key.replaceAll('_', ' ')}</span>
                          <strong>
                            {value === null || value === undefined
                              ? 'Not recorded'
                              : typeof value === 'object'
                                ? JSON.stringify(value)
                                : String(value)}
                          </strong>
                        </div>
                      ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
