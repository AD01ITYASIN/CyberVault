
import { useEffect, useState } from 'react'
import {
  Activity,
  RefreshCw,
  Trophy,
  Route,
  Search,
  Network,
  AlertCircle,
  ArrowRight,
  GitBranch,
} from 'lucide-react'

const API = 'https://cyber-vault-pu6h.vercel.app/api'

export default function GraphAnalytics() {
  const [mode, setMode] = useState('pagerank')
  const [rankings, setRankings] = useState([])
  const [source, setSource] = useState('S001')
  const [target, setTarget] = useState('C001')
  const [pathData, setPathData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  async function readJson(response) {
    const contentType = response.headers.get('content-type') || ''

    if (!contentType.includes('application/json')) {
      throw new Error(
        'The API returned a non-JSON response. Check that the backend is running.'
      )
    }

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'The analytics request failed.')
    }

    return data
  }

  async function loadPageRank() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API}/analytics/pagerank`)
      const data = await readJson(response)

      setRankings(data.rankings || [])
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message || 'Unable to load PageRank results.')
      setRankings([])
    } finally {
      setLoading(false)
    }
  }

  async function findShortestPath(event) {
    event?.preventDefault()

    if (!source.trim() || !target.trim()) {
      setError('Enter both a source ID and a target ID.')
      return
    }

    setLoading(true)
    setError('')
    setPathData(null)

    try {
      const params = new URLSearchParams({
        source: source.trim(),
        target: target.trim(),
      })

      const response = await fetch(
        `${API}/analytics/shortest-path?${params.toString()}`
      )

      const data = await readJson(response)
      setPathData(data)
      setLastUpdated(new Date())

      if (data.length == null) {
        setError(data.message || 'No path exists between these entities.')
      }
    } catch (err) {
      setError(err.message || 'Unable to calculate the shortest path.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPageRank()
  }, [])

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')

    if (nextMode === 'pagerank') {
      loadPageRank()
    } else {
      setPathData(null)
    }
  }

  return (
    <section className="analytics-page">
      <div className="analytics-toolbar">
        <div>
          <h2>Graph Analytics</h2>
          <p>
            Rank influential entities and investigate connections in your
            Neo4j knowledge graph.
          </p>
        </div>

        <button
          className="analytics-refresh"
          type="button"
          onClick={() =>
            mode === 'pagerank'
              ? loadPageRank()
              : findShortestPath()
          }
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          {loading ? 'Working...' : 'Refresh'}
        </button>
      </div>

      <div className="analytics-modes">
        <button
          type="button"
          className={`analytics-mode ${
            mode === 'pagerank' ? 'selected' : ''
          }`}
          onClick={() => switchMode('pagerank')}
        >
          <Trophy size={20} />
          <span>
            <strong>PageRank</strong>
            <small>Rank influential entities</small>
          </span>
        </button>

        <button
          type="button"
          className={`analytics-mode ${
            mode === 'shortest' ? 'selected' : ''
          }`}
          onClick={() => switchMode('shortest')}
        >
          <Route size={20} />
          <span>
            <strong>Shortest Path</strong>
            <small>Find a connection between entities</small>
          </span>
        </button>
      </div>

      {error && (
        <div className="analytics-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {mode === 'pagerank' ? (
        <section className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <h3>PageRank results</h3>
              <p>
                Entities ordered by their calculated graph importance score.
              </p>
            </div>

            <span className="analytics-count">
              {rankings.length} results
            </span>
          </div>

          {loading && rankings.length === 0 ? (
            <div className="analytics-empty">
              <RefreshCw size={24} className="spin" />
              <p>Calculating PageRank...</p>
            </div>
          ) : rankings.length > 0 ? (
            <div className="analytics-table-wrap">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Entity</th>
                    <th>Type</th>
                    <th>PageRank score</th>
                  </tr>
                </thead>

                <tbody>
                  {rankings.map((entity, index) => (
                    <tr key={entity.id || `${entity.name}-${index}`}>
                      <td>
                        <span className="analytics-rank">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </td>
                      <td className="analytics-entity-name">
                        {entity.name || 'Unnamed entity'}
                      </td>
                      <td>
                        <span className="analytics-type">
                          {entity.type || 'Entity'}
                        </span>
                      </td>
                      <td className="analytics-score">
                        {Number(entity.score).toFixed(6)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="analytics-empty">
              <Network size={28} />
              <p>No PageRank results available.</p>
              <small>
                Check the backend response and the GDS graph projection.
              </small>
            </div>
          )}

          {lastUpdated && mode === 'pagerank' && (
            <div className="analytics-updated">
              Last retrieved: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </section>
      ) : (
        <section className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <h3>Shortest Path Analysis</h3>
              <p>
                Find the shortest recorded relationship path between two
                entity IDs.
              </p>
            </div>
          </div>

          <form className="path-form" onSubmit={findShortestPath}>
            <label>
              Source entity ID
              <input
                value={source}
                onChange={event => setSource(event.target.value)}
                placeholder="e.g. S001"
                required
              />
            </label>

            <ArrowRight size={20} className="path-form-arrow" />

            <label>
              Target entity ID
              <input
                value={target}
                onChange={event => setTarget(event.target.value)}
                placeholder="e.g. C001"
                required
              />
            </label>

            <button type="submit" disabled={loading}>
              <Search size={16} />
              {loading ? 'Searching...' : 'Find path'}
            </button>
          </form>

          {pathData && pathData.length != null && (
            <div className="path-results">
              <div className="path-summary">
                <div className="path-summary-icon">
                  <GitBranch size={20} />
                </div>
                <div>
                  <strong>
                    {pathData.length === 0
                      ? 'Entity matched itself'
                      : `${pathData.length} relationship${
                          pathData.length === 1 ? '' : 's'
                        } found`}
                  </strong>
                  <p>
                    {pathData.path?.length || 0} entities in the returned path
                  </p>
                </div>
              </div>

              <div className="path-visual">
                {(pathData.path || []).map((entity, index) => (
                  <div
                    className="path-step"
                    key={`${entity.id || entity.name}-${index}`}
                  >
                    <div className="path-node">
                      <span>{entity.type || 'Entity'}</span>
                      <strong>{entity.name || entity.id}</strong>
                      <small>{entity.id}</small>
                    </div>

                    {index < pathData.path.length - 1 && (
                      <div className="path-connection">
                        <div className="path-line" />
                        <span>
                          {pathData.edges?.[index]?.type || 'CONNECTED_TO'}
                        </span>
                        <ArrowRight size={17} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {lastUpdated && (
                <div className="analytics-updated">
                  Last retrieved: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
          )}

          {!pathData && !loading && (
            <div className="analytics-empty">
              <Route size={28} />
              <p>Enter two entity IDs to find their shortest path.</p>
              <small>
                Example: S001 to C001, if those IDs exist in your database.
              </small>
            </div>
          )}
        </section>
      )}
    </section>
  )
}
