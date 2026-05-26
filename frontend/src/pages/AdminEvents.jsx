import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchEvents, createEvent, deleteEvent, updateEvent, approveEvent, cancelEvent } from '../services/api.js';

function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({
    title: '',
    category: '',
    city: '',
    venue: '',
    organizer: '',
    description: '',
    banner_url: '',
    photo_urls: [''],
    video_url: '',
    start_date: '',
    ticket_price: '',
    ticket_quantity: '',
    status: 'published',
  });
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editMessage, setEditMessage] = useState('');

  const loadEvents = async () => {
    const response = await fetchEvents({ admin: true });
    setEvents(response.events || []);
  };

  const approve = async (eventId) => {
    const res = await approveEvent(eventId);
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, ...res.event } : e)));
  };

  const cancel = async (eventId) => {
    const res = await cancelEvent(eventId);
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, ...res.event } : e)));
  };

  useEffect(() => {
    loadEvents().catch(console.error);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await createEvent({
        ...form,
        ticket_price: Number(form.ticket_price),
        ticket_quantity: Number(form.ticket_quantity),
        photo_urls: form.photo_urls.filter(Boolean),
      });
      setMessage('Event created successfully');
      setForm({
        title: '',
        category: '',
        city: '',
        venue: '',
        organizer: '',
        description: '',
        banner_url: '',
        photo_urls: [''],
        video_url: '',
        start_date: '',
        ticket_price: '',
        ticket_quantity: '',
        status: 'published',
      });
      setEvents((prev) => [response.event, ...prev]);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Unable to create event');
    }
  };

  const removeEvent = async (eventId) => {
    await deleteEvent(eventId);
    setEvents((prev) => prev.filter((event) => event.id !== eventId));
  };

  const startEdit = (eventItem) => {
    setEditingId(eventItem.id);
    setEditForm({
      title: eventItem.title || '',
      description: eventItem.description || '',
      category: eventItem.category || '',
      city: eventItem.city || '',
      venue: eventItem.venue || '',
      organizer: eventItem.organizer || '',
      banner_url: eventItem.banner_url || '',
      photo_urls: eventItem.photo_urls && eventItem.photo_urls.length ? eventItem.photo_urls : [''],
      video_url: eventItem.video_url || '',
      ticket_price: eventItem.ticket_price || 0,
      ticket_quantity: eventItem.ticket_quantity || 0,
      status: eventItem.status || 'published',
    });
    setEditMessage('');
  };

  const handleEditChange = (name, value) => {
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const updatePhotoUrl = (index, value, isEdit = false) => {
    if (isEdit) {
      setEditForm((prev) => {
        const urls = [...(prev.photo_urls || [''])];
        urls[index] = value;
        return { ...prev, photo_urls: urls };
      });
    } else {
      setForm((prev) => {
        const urls = [...prev.photo_urls];
        urls[index] = value;
        return { ...prev, photo_urls: urls };
      });
    }
  };

  const addPhotoUrlField = (isEdit = false) => {
    if (isEdit) {
      setEditForm((prev) => ({ ...prev, photo_urls: [...(prev.photo_urls || []), ''] }));
    } else {
      setForm((prev) => ({ ...prev, photo_urls: [...prev.photo_urls, ''] }));
    }
  };

  const removePhotoUrlField = (index, isEdit = false) => {
    if (isEdit) {
      setEditForm((prev) => ({
        ...prev,
        photo_urls: prev.photo_urls.filter((_, idx) => idx !== index) || [''],
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        photo_urls: prev.photo_urls.filter((_, idx) => idx !== index),
      }));
    }
  };

  const saveEdit = async (eventId) => {
    try {
      const response = await updateEvent(eventId, {
        ...editForm,
        ticket_price: Number(editForm.ticket_price),
        ticket_quantity: Number(editForm.ticket_quantity),
        photo_urls: editForm.photo_urls?.filter(Boolean) || [],
      });
      setEvents((prev) => prev.map((event) => (event.id === eventId ? { ...event, ...response.event } : event)));
      setMessage('Event updated successfully');
      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      setEditMessage(err.response?.data?.message || 'Unable to update event');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditMessage('');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
      <div className="glass-card rounded-[36px] border border-white/10 p-8">
        <h1 className="text-4xl font-semibold text-white">Admin event manager</h1>
        <p className="mt-3 text-white/70">Create and manage event inventory for the K-MER platform.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="glass-card rounded-[36px] border border-white/10 p-8">
          <h2 className="text-2xl font-semibold text-white">Create new event</h2>
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-white/70">
                Title
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
                />
              </label>
              <label className="block text-white/70">
                Category
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-white/70">
                City
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
                />
              </label>
              <label className="block text-white/70">
                Venue
                <input
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
                />
              </label>
            </div>

            <label className="block text-white/70">
              Organizer
              <input
                value={form.organizer}
                onChange={(e) => setForm({ ...form, organizer: e.target.value })}
                className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
              />
            </label>

            <label className="block text-white/70">
              Description
              <textarea
                rows="4"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
              />
            </label>

            <label className="block text-white/70">
              Banner URL
              <input
                value={form.banner_url}
                onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
                className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
              />
            </label>

            <label className="block text-white/70">
              Video URL
              <input
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
              />
            </label>

            <div className="p-4 space-y-3 border rounded-3xl border-white/10 bg-white/5">
              <p className="text-sm uppercase tracking-[0.25em] text-white/70">Photo URLs</p>
              {form.photo_urls.map((photoUrl, index) => (
                <div key={index} className="flex gap-3">
                  <input
                    value={photoUrl}
                    placeholder="Photo URL"
                    onChange={(e) => updatePhotoUrl(index, e.target.value)}
                    className="w-full px-5 py-4 text-white border rounded-3xl border-white/10 bg-black/30"
                  />
                  {form.photo_urls.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removePhotoUrlField(index)}
                      className="px-4 py-3 text-sm font-semibold text-white transition border rounded-full border-white/10 bg-rose-500 hover:bg-rose-400"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addPhotoUrlField()}
                className="px-5 py-3 text-sm font-semibold text-white transition rounded-full bg-sky-500 hover:bg-sky-400"
              >
                Add another photo
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-white/70">
                Start date
                <input
                  type="datetime-local"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
                />
              </label>
              <label className="block text-white/70">
                Ticket quantity
                <input
                  type="number"
                  min="1"
                  value={form.ticket_quantity}
                  onChange={(e) => setForm({ ...form, ticket_quantity: e.target.value })}
                  className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-white/70">
                Price
                <input
                  type="number"
                  step="0.01"
                  value={form.ticket_price}
                  onChange={(e) => setForm({ ...form, ticket_price: e.target.value })}
                  className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
                />
              </label>
              <label className="block text-white/70">
                Status
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
                >
                  <option value="published">Published</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>

            {message ? <p className="text-sm text-neon">{message}</p> : null}
            <button type="submit" className="px-6 py-4 text-sm font-semibold transition rounded-full bg-neon text-night hover:bg-white">
              Create event
            </button>
          </form>
        </section>

        <section className="glass-card rounded-[36px] border border-white/10 p-8">
          <h2 className="text-2xl font-semibold text-white">Current events</h2>
          <div className="mt-6 space-y-4">
            {events.map((eventItem) => {
              const soldCount = eventItem.sold_tickets ?? (eventItem.ticket_quantity - eventItem.remaining_tickets);
              return (
                <div key={eventItem.id} className="p-5 border rounded-3xl border-white/10 bg-black/20">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.25em] text-neon">{eventItem.category}</p>
                      <h3 className="text-xl font-semibold text-white">{eventItem.title}</h3>
                      <p className="text-sm text-white/70">{eventItem.city} � {new Date(eventItem.start_date).toLocaleDateString()}</p>
                    </div>
                      <div className="flex items-center gap-3">
                      {eventItem.status === 'pending' ? (
                        <>
                          <button onClick={() => approve(eventItem.id)} className="px-4 py-2 text-sm font-semibold text-white transition rounded-full bg-neon hover:bg-white">
                            Valider
                          </button>
                          <button onClick={() => cancel(eventItem.id)} className="px-4 py-2 text-sm font-semibold text-white transition rounded-full bg-rose-500 hover:bg-rose-400">
                            Annuler
                          </button>
                        </>
                      ) : null}

                      <button onClick={() => startEdit(eventItem)} className="px-4 py-2 text-sm font-semibold text-white transition rounded-full bg-sky-500 hover:bg-sky-400">
                        Modifier
                      </button>
                      <button onClick={() => removeEvent(eventItem.id)} className="px-4 py-2 text-sm font-semibold text-white transition rounded-full bg-rose-500 hover:bg-rose-400">
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 mt-4 sm:grid-cols-3">
                    <div className="p-4 border rounded-3xl border-white/10 bg-white/5">
                      <p className="text-sm uppercase tracking-[0.25em] text-white/40">Places vendues</p>
                      <p className="mt-2 text-lg font-semibold text-white">{soldCount}</p>
                    </div>
                    <div className="p-4 border rounded-3xl border-white/10 bg-white/5">
                      <p className="text-sm uppercase tracking-[0.25em] text-white/40">Places restantes</p>
                      <p className="mt-2 text-lg font-semibold text-white">{eventItem.remaining_tickets}</p>
                    </div>
                    <div className="p-4 border rounded-3xl border-white/10 bg-white/5">
                      <p className="text-sm uppercase tracking-[0.25em] text-white/40">Total places</p>
                      <p className="mt-2 text-lg font-semibold text-white">{eventItem.ticket_quantity}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4 text-sm text-white/70">
                    <span>{eventItem.video_url ? 'Vid�o configur�e' : 'Image configur�e'}</span>
                    <span>�</span>
                    <span>{eventItem.buyers?.length ? `${eventItem.buyers.length} acheteur(s)` : 'Aucun acheteur encore'}</span>
                  </div>

                  {eventItem.buyers?.length > 0 ? (
                    <p className="mt-3 text-sm text-white/70">Acheteurs: {eventItem.buyers.join(', ')}</p>
                  ) : null}

                  {editingId === eventItem.id && editForm ? (
                    <div className="p-6 mt-6 space-y-4 border rounded-3xl border-white/10 bg-black/30">
                      <h4 className="text-lg font-semibold text-white">Modifier l'�v�nement</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block text-white/70">
                          Titre
                          <input
                            value={editForm.title}
                            onChange={(e) => handleEditChange('title', e.target.value)}
                            className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
                          />
                        </label>
                        <label className="block text-white/70">
                          Cat�gorie
                          <input
                            value={editForm.category}
                            onChange={(e) => handleEditChange('category', e.target.value)}
                            className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
                          />
                        </label>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block text-white/70">
                          Ville
                          <input
                            value={editForm.city}
                            onChange={(e) => handleEditChange('city', e.target.value)}
                            className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
                          />
                        </label>
                        <label className="block text-white/70">
                          Lieu
                          <input
                            value={editForm.venue}
                            onChange={(e) => handleEditChange('venue', e.target.value)}
                            className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
                          />
                        </label>
                      </div>

                      <label className="block text-white/70">
                        Organisateur
                        <input
                          value={editForm.organizer}
                          onChange={(e) => handleEditChange('organizer', e.target.value)}
                          className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
                        />
                      </label>

                      <label className="block text-white/70">
                        Description
                        <textarea
                          rows="4"
                          value={editForm.description}
                          onChange={(e) => handleEditChange('description', e.target.value)}
                          className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
                        />
                      </label>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block text-white/70">
                          Banni�re URL
                          <input
                            value={editForm.banner_url}
                            onChange={(e) => handleEditChange('banner_url', e.target.value)}
                            className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
                          />
                        </label>
                        <label className="block text-white/70">
                          Vid�o URL
                          <input
                            value={editForm.video_url}
                            onChange={(e) => handleEditChange('video_url', e.target.value)}
                            className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
                          />
                        </label>
                      </div>

                      <div className="p-4 space-y-3 border rounded-3xl border-white/10 bg-white/5">
                        <p className="text-sm uppercase tracking-[0.25em] text-white/70">Photo URLs</p>
                        {editForm.photo_urls.map((photoUrl, index) => (
                          <div key={index} className="flex gap-3">
                            <input
                              value={photoUrl}
                              placeholder="Photo URL"
                              onChange={(e) => updatePhotoUrl(index, e.target.value, true)}
                              className="w-full px-5 py-4 text-white border rounded-3xl border-white/10 bg-black/30"
                            />
                            {editForm.photo_urls.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => removePhotoUrlField(index, true)}
                                className="px-4 py-3 text-sm font-semibold text-white transition border rounded-full border-white/10 bg-rose-500 hover:bg-rose-400"
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addPhotoUrlField(true)}
                          className="px-5 py-3 text-sm font-semibold text-white transition rounded-full bg-sky-500 hover:bg-sky-400"
                        >
                          Add another photo
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block text-white/70">
                          Nombre de places
                          <input
                            type="number"
                            min="1"
                            value={editForm.ticket_quantity}
                            onChange={(e) => handleEditChange('ticket_quantity', e.target.value)}
                            className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
                          />
                        </label>
                        <label className="block text-white/70">
                          Prix
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.ticket_price}
                            onChange={(e) => handleEditChange('ticket_price', e.target.value)}
                            className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
                          />
                        </label>
                      </div>

                      {editMessage ? <p className="text-sm text-neon">{editMessage}</p> : null}

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <button onClick={() => saveEdit(eventItem.id)} type="button" className="px-6 py-3 text-sm font-semibold transition rounded-full bg-neon text-night hover:bg-white">
                          Save changes
                        </button>
                        <button onClick={cancelEdit} type="button" className="px-6 py-3 text-sm font-semibold text-white transition border rounded-full border-white/10 hover:border-neon">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </motion.div>
  );
}

export default AdminEvents;
