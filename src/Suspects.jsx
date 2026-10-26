
import { useEffect, useState } from 'react'
import {
  Search,
  RefreshCw,
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'

const API_URL = 'http://localhost:3001/api/suspects'

const emptyForm = {
  suspect_id: '',
  name: '',
  alias: '',
  status: 'Under Investigation',
}

export default function Suspects() {
  const [suspects, setSuspects] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function loadSuspects(signal) {
    setLoading(true)
    setError('')

    try {
      const url = new URL(API_URL)
      if (search.trim()) url.searchParams.set('search', search.trim())

      const response = await fetch(url, { signal })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Could not load suspects.')
      }

      setSuspects(data.suspects || [])
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Unable to load suspects.')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    loadSuspects(controller.signal)
    return () => controller.abort()
  }, [search, refreshKey])

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setNotice('')
    setFormOpen(true)
  }

  function openEditForm(suspect) {
    setEditingId(suspect.suspect_id)
    setForm({
      suspect_id: suspect.suspect_id || '',
      name: suspect.name || '',
      alias: suspect.alias || '',
      status: suspect.status || 'Under Investigation',
    })
    setError('')
    setNotice('')
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function updateField(event) {
    const { name, value } = event.target
    setForm(current => ({ ...current, [name]: value }))
  }

  async function saveSuspect(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    try {
      const editing = editingId !== null
      const endpoint = editing
        ? `${API_URL}/${encodeURIComponent(editingId)}`
        : API_URL

      const response = await fetch(endpoint, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          alias: form.alias,
          status: form.status,
          ...(editing ? {} : { suspect_id: form.suspect_id }),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Could not save suspect.')
      }

      closeForm()
      setNotice(editing ? 'Suspect updated successfully.' : 'Suspect created successfully.')
      setRefreshKey(key => key + 1)
    } catch (err) {
      setError(err.message || 'Unable to save suspect.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteSuspect(suspect) {
    const confirmed = window.confirm(
      `Delete ${suspect.name} (${suspect.suspect_id})? This also deletes relationships connected to this suspect. This action cannot be undone.`
    )

    if (!confirmed) return

    setError('')
    setNotice('')

    try {
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(suspect.suspect_id)}`,
        { method: 'DELETE' }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Could not delete suspect.')
      }

      setNotice(`Suspect ${suspect.suspect_id} deleted successfully.`)
      setRefreshKey(key => key + 1)
    } catch (err) {
      setError(err.message || 'Unable to delete suspect.')
    }
  }

  return (
    <section className="records-page">
      <div className="records-toolbar">
        <div>
          <h2>Suspect registry</h2>
          <p>Manage suspect records stored in Neo4j</p>
        </div>

        <div className="records-actions">
          <button
            className="records-refresh"
            onClick={() => setRefreshKey(key => key + 1)}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button className="records-primary" onClick={openCreateForm}>
            <Plus size={16} />
            Add suspect
          </button>
        </div>
      </div>

      {notice && <div className="records-success">{notice}</div>}
      {error && <div className="records-error">{error}</div>}

      {formOpen && (
        <form className="suspect-form" onSubmit={saveSuspect}>
          <div className="suspect-form-heading">
            <h3>{editingId !== null ? 'Edit suspect' : 'Add suspect'}</h3>
            <button
              type="button"
              className="records-icon-button"
              onClick={closeForm}
              aria-label="Close form"
            >
              <X size={18} />
            </button>
          </div>

          {!editingId && (
            <label>
              Suspect ID
              <input
                name="suspect_id"
                value={form.suspect_id}
                onChange={updateField}
                placeholder="For example, S020"
                required
              />
            </label>
          )}

          <label>
            Name
            <input
              name="name"
              value={form.name}
              onChange={updateField}
              required
            />
          </label>

          <label>
            Alias
            <input
              name="alias"
              value={form.alias}
              onChange={updateField}
            />
          </label>

          <label>
            Status
            <select
              name="status"
              value={form.status}
              onChange={updateField}
            >
              <option>Under Investigation</option>
              <option>Active</option>
              <option>Closed</option>
              <option>Cleared</option>
            </select>
          </label>

          <div className="suspect-form-actions">
            <button
              type="button"
              className="records-refresh"
              onClick={closeForm}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="records-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : editingId !== null ? 'Save changes' : 'Create suspect'}
            </button>
          </div>
        </form>
      )}

      <div className="records-summary">
        <Users size={18} />
        <span>
          {loading ? 'Loading records...' : `${suspects.length} records in this result`}
        </span>
      </div>

      <label className="records-search">
        <Search size={18} />
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search by name, suspect ID or alias"
        />
      </label>

      <div className="records-table-wrap">
        <table className="records-table">
          <thead>
            <tr>
              <th>Suspect ID</th>
              <th>Name</th>
              <th>Alias</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {!loading && !error && suspects.map((suspect, index) => (
              <tr key={suspect.suspect_id || suspect.element_id || index}>
                <td>{suspect.suspect_id || 'Not specified'}</td>
                <td>{suspect.name || 'Not specified'}</td>
                <td>{suspect.alias || 'Not specified'}</td>
                <td>
                  <span className="record-status">
                    {suspect.status || 'Unspecified'}
                  </span>
                </td>
                <td>
                  <div className="record-row-actions">
                    <button
                      className="records-icon-button"
                      onClick={() => openEditForm(suspect)}
                      aria-label={`Edit ${suspect.name}`}
                      title="Edit suspect"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="records-icon-button delete-action"
                      onClick={() => deleteSuspect(suspect)}
                      aria-label={`Delete ${suspect.name}`}
                      title="Delete suspect"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!loading && !error && suspects.length === 0 && (
              <tr>
                <td colSpan={5} className="records-empty">
                  No matching suspects found.
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td colSpan={5} className="records-empty">
                  Loading suspect records...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="records-note">
        Search results are limited to 100 records per request.
      </p>
    </section>
  )
}
