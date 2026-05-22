import { useState, useEffect } from 'react';
import { events as eventApi } from '../../api';
import { useToast } from '../../hooks/useToast';
import './MonthlyEvents.css';

const EMPTY_FORM = { title: '', description: '', date: '' };

export default function MonthlyEvents() {
  const { toast, ToastContainer } = useToast();
  const [events, setEvents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      setEvents(await eventApi.getAll());
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const openModal = (event = null) => {
    if (event) {
      setEditingId(event.id);
      setForm({ title: event.title, description: event.description, date: event.date });
    } else {
      setEditingId(null);
      setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) {
      toast('Please enter title and date.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        date: form.date,
      };

      if (editingId) {
        await eventApi.update(editingId, payload);
        toast('Event updated successfully.', 'success');
      } else {
        await eventApi.create(payload);
        toast('Event added successfully.', 'success');
      }

      closeModal();
      fetchEvents();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this event?')) return;
    try {
      await eventApi.delete(id);
      toast('Event removed.', 'success');
      fetchEvents();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      <ToastContainer />
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Monthly Events</div>
          <div className="page-sub">Add, edit and remove events that appear on the dashboard.</div>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>+ Add Event</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Title</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>
                    No monthly events yet. Add one to make it visible on the dashboard.
                  </td>
                </tr>
              ) : events.map((event, index) => (
                <tr key={event.id}>
                  <td>{index + 1}</td>
                  <td>{formatDate(event.date)}</td>
                  <td>{event.title}</td>
                  <td>{event.description}</td>
                  <td className="row-actions">
                    <button className="btn btn-sm btn-outline" onClick={() => openModal(event)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(event.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{editingId ? 'Edit Event' : 'Add Event'}</div>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="input" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Team review" />
            </div>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input className="input" type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="input" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Event details and notes" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update Event' : 'Create Event'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
