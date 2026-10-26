
import { useEffect, useState } from 'react'
import CytoscapeComponent from 'react-cytoscapejs'
import {
  RefreshCw,
  Search,
  Network,
  GitBranch,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
} from 'lucide-react'

import './GraphExplorer.css'

const API = 'http://localhost:3001/api'

const stylesheet = [
  {
    selector: 'node',
    style: {
      'background-color': '#0f766e',
      label: 'data(label)',
      color: '#e2e8f0',
      'font-size': 11,
      'text-wrap': 'wrap',
      'text-max-width': 120,
      'text-valign': 'bottom',
      'text-margin-y': 8,
      width: 42,
      height: 42,
      'border-width': 2,
      'border-color': '#5eead4',
    },
  },
  {
    selector: 'node[type = "Suspect"]',
    style: {
      'background-color': '#b45309',
      'border-color': '#fbbf24',
      shape: 'round-rectangle',
    },
  },
  {
    selector: 'node[type = "Case"]',
    style: {
      'background-color': '#0369a1',
      'border-color': '#7dd3fc',
      shape: 'round-rectangle',
    },
  },
  {
    selector: 'edge',
    style: {
      width: 1.5,
      'line-color': '#475569',
      'target-arrow-color': '#5eead4',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      label: 'data(label)',
      color: '#94a3b8',
      'font-size': 8,
      'text-rotation': 'autorotate',
      'text-background-color': '#111923',
      'text-background-opacity': 0.85,
      'text-background-padding': 2,
    },
  },
  {
    selector: ':selected',
    style: {
      'border-width': 4,
      'border-color': '#5eead4',
      'overlay-color': '#5eead4',
      'overlay-opacity': 0.12,
    },
  },
]

export default function GraphExplorer() {
  const [graph, setGraph] = useState({ nodes: [], edges: [] })
  const [selected, setSelected] = useState(null)
  const [selectedRelationship, setSelectedRelationship] = useState(null)
  const [suspectId, setSuspectId] = useState('S001')
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [entityType, setEntityType] = useState('All')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [graphVersion, setGraphVersion] = useState(0)
  const [cyInstance, setCyInstance] = useState(null)

  async function loadGraph(id = suspectId) {
    const normalizedId = String(id || '').trim()

    if (!normalizedId) {
      setError('Enter a suspect ID first.')
      return
    }

    setLoading(true)
    setError('')
    setSelected(null)
    setSelectedRelationship(null)

    try {
      const response = await fetch(
        `${API}/graph?suspectId=${encodeURIComponent(normalizedId)}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load graph.')
      }

      setGraph({
        nodes: data.nodes || [],
        edges: data.edges || [],
      })
      setSuspectId(normalizedId)
      setEntityType('All')
      setGraphVersion(version => version + 1)
    } catch (err) {
      setGraph({ nodes: [], edges: [] })
      setSelected(null)
      setSelectedRelationship(null)
      setError(err.message || 'Unable to connect to the API.')
    } finally {
      setLoading(false)
    }
  }

  async function searchSuspects(event) {
    event.preventDefault()
    setSearching(true)
    setError('')
    setSearchResults([])

    try {
      const response = await fetch(
        `${API}/suspects?search=${encodeURIComponent(search.trim())}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Suspect search failed.')
      }

      const results = data.suspects || []
      setSearchResults(results)

      if (results.length === 0) {
        setError('No matching suspects found.')
      }
    } catch (err) {
      setError(err.message || 'Unable to search suspects.')
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    loadGraph('S001')
  }, [])

  function handleGraphReady(cy) {
    setCyInstance(cy)

    cy.off('tap', 'node')
    cy.off('tap', 'edge')

    cy.on('tap', 'node', event => {
      setSelected({ ...event.target.data() })
      setSelectedRelationship(null)
    })

    cy.on('tap', 'edge', event => {
      setSelected(null)
      setSelectedRelationship({ ...event.target.data() })
    })

    cy.one('layoutstop', () => {
      cy.fit(undefined, 45)
    })
  }

  function selectSearchResult(suspect) {
    setSearchResults([])
    setSearch(suspect.name || suspect.suspect_id || '')
    loadGraph(suspect.suspect_id)
  }

  function zoomGraph(factor) {
    if (!cyInstance) return

    const level = Math.max(
      cyInstance.minZoom(),
      Math.min(cyInstance.maxZoom(), cyInstance.zoom() * factor)
    )

    cyInstance.zoom({
      level,
      renderedPosition: {
        x: cyInstance.width() / 2,
        y: cyInstance.height() / 2,
      },
    })
  }

  function fitGraph() {
    if (!cyInstance) return
    cyInstance.fit(undefined, 45)
  }

  function resetLayout() {
    if (!cyInstance || cyInstance.destroyed()) return

    cyInstance.layout({
      name: 'cose',
      animate: true,
      animationDuration: 300,
      padding: 70,
      nodeRepulsion: 12000,
      idealEdgeLength: 150,
      componentSpacing: 100,
    }).run()
  }

  const visibleNodeIds = new Set(
    graph.nodes
      .filter(
        node => entityType === 'All' || node.data.type === entityType
      )
      .map(node => node.data.id)
  )

  const visibleElements = [
    ...graph.nodes.filter(node => visibleNodeIds.has(node.data.id)),
    ...graph.edges.filter(
      edge =>
        visibleNodeIds.has(edge.data.source) &&
        visibleNodeIds.has(edge.data.target)
    ),
  ]

  const entityTypes = [
    'All',
    ...new Set(graph.nodes.map(node => node.data.type).filter(Boolean)),
  ]

  const selectedSource = selectedRelationship
    ? graph.nodes.find(
        node => node.data.id === selectedRelationship.source
      )?.data
    : null

  const selectedTarget = selectedRelationship
    ? graph.nodes.find(
        node => node.data.id === selectedRelationship.target
      )?.data
    : null

  return (
    <section className="graph-page">
      <div className="graph-toolbar">
        <div>
          <h2>Graph Explorer</h2>
          <p>Explore entities and their recorded relationships.</p>
        </div>

        <div className="graph-controls">
          <input
            aria-label="Suspect ID"
            value={suspectId}
            onChange={event => setSuspectId(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') loadGraph()
            }}
            placeholder="Suspect ID, e.g. S001"
          />

          <button
            type="button"
            onClick={() => loadGraph()}
            disabled={loading}
          >
            <RefreshCw size={16} />
            {loading ? 'Loading...' : 'Load graph'}
          </button>
        </div>
      </div>

      <form className="graph-search" onSubmit={searchSuspects}>
        <div className="graph-search-input">
          <Search size={17} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search suspects by name, ID, or alias"
            aria-label="Search suspects"
          />
        </div>

        <button type="submit" disabled={searching}>
          {searching ? 'Searching...' : 'Search'}
        </button>

        <select
          value={entityType}
          onChange={event => {
            setEntityType(event.target.value)
            setSelected(null)
            setSelectedRelationship(null)
          }}
          aria-label="Filter graph by entity type"
        >
          {entityTypes.map(type => (
            <option key={type} value={type}>
              {type === 'All' ? 'All entity types' : type}
            </option>
          ))}
        </select>
      </form>

      {searchResults.length > 0 && (
        <div className="graph-search-results">
          <strong>Matching suspects</strong>
          {searchResults.map(suspect => (
            <button
              type="button"
              key={suspect.suspect_id || suspect.element_id}
              onClick={() => selectSearchResult(suspect)}
            >
              <span>{suspect.name || 'Unnamed suspect'}</span>
              <small>
                {suspect.suspect_id || 'No ID'}
                {suspect.alias ? ` · ${suspect.alias}` : ''}
              </small>
            </button>
          ))}
        </div>
      )}

      {error && <p className="graph-error">{error}</p>}

      <div className="graph-layout">
        <div className="graph-canvas">
          <div className="graph-canvas-toolbar">
            <button
              type="button"
              title="Zoom in"
              aria-label="Zoom in"
              onClick={() => zoomGraph(1.2)}
              disabled={!cyInstance}
            >
              <ZoomIn size={17} />
            </button>

            <button
              type="button"
              title="Zoom out"
              aria-label="Zoom out"
              onClick={() => zoomGraph(1 / 1.2)}
              disabled={!cyInstance}
            >
              <ZoomOut size={17} />
            </button>

            <button
              type="button"
              title="Fit graph to canvas"
              aria-label="Fit graph to canvas"
              onClick={fitGraph}
              disabled={!cyInstance}
            >
              <Maximize2 size={17} />
            </button>

            <button
              type="button"
              title="Reset graph layout"
              aria-label="Reset graph layout"
              onClick={resetLayout}
              disabled={!cyInstance}
            >
              <RotateCcw size={17} />
            </button>
          </div>

          {visibleElements.length > 0 ? (
            <CytoscapeComponent
              key={graphVersion}
              elements={visibleElements}
              stylesheet={stylesheet}
              layout={{
                name: 'cose',
                animate: false,
                padding: 70,
                nodeRepulsion: 12000,
                idealEdgeLength: 150,
                componentSpacing: 100,
              }}
              cy={handleGraphReady}
              style={{
                width: '100%',
                height: '520px',
              }}
            />
          ) : (
            <div className="graph-empty">
              <Network size={34} />
              <p>
                {loading
                  ? 'Loading graph...'
                  : 'No graph data to display for this filter.'}
              </p>
            </div>
          )}
        </div>

        <aside className="graph-details">
          <h3>
            {selectedRelationship
              ? 'Relationship details'
              : 'Entity details'}
          </h3>

          {selectedRelationship ? (
            <>
              <p className="graph-type">RELATIONSHIP</p>

              <div className="relationship-heading">
                <GitBranch size={20} />
                <h4>{selectedRelationship.label || 'Connection'}</h4>
              </div>

              <div className="graph-property">
                <span>Relationship type</span>
                <strong>{selectedRelationship.label || 'N/A'}</strong>
              </div>

              <div className="graph-property">
                <span>Source entity</span>
                <strong>
                  {selectedSource?.label ||
                    selectedRelationship.source ||
                    'N/A'}
                </strong>
              </div>

              <div className="graph-property">
                <span>Source node ID</span>
                <strong>{selectedRelationship.source || 'N/A'}</strong>
              </div>

              <div className="graph-property">
                <span>Target entity</span>
                <strong>
                  {selectedTarget?.label ||
                    selectedRelationship.target ||
                    'N/A'}
                </strong>
              </div>

              <div className="graph-property">
                <span>Target node ID</span>
                <strong>{selectedRelationship.target || 'N/A'}</strong>
              </div>
            </>
          ) : selected && visibleNodeIds.has(selected.id) ? (
            <>
              <p className="graph-type">{selected.type || 'Entity'}</p>
              <h4>{selected.label || selected.id}</h4>

              {Object.entries(selected.properties || {}).map(
                ([key, value]) => (
                  <div className="graph-property" key={key}>
                    <span>{key.replaceAll('_', ' ')}</span>
                    <strong>{String(value ?? 'N/A')}</strong>
                  </div>
                )
              )}

              {selected.suspectId && (
                <button
                  type="button"
                  onClick={() => loadGraph(selected.suspectId)}
                >
                  Explore this suspect
                </button>
              )}
            </>
          ) : (
            <p className="graph-hint">
              Select a node to inspect its properties, or select a
              relationship line to inspect the connection between entities.
            </p>
          )}

          <div className="graph-legend">
            <span><i className="legend-suspect" /> Suspect</span>
            <span><i className="legend-case" /> Case</span>
            <span><i className="legend-entity" /> Other entity</span>
          </div>
        </aside>
      </div>
    </section>
  )
}
