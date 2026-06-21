import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchEvents, createEvent, deleteEvent, updateEvent, approveEvent, cancelEvent } from '../services/api.js';
import ImageUploader from '../components/ImageUploader.jsx';
import VideoUploader from '../components/VideoUploader.jsx';
import LocationPicker from '../components/LocationPicker.jsx';

const emptyForm = {
  title: '',
  category: '',
  city: '',
  venue: '',
  organizer: '',
  description: '',
  banner_url: '',
  photo_urls: [],
  video_url: '',
  latitude: '',
  longitude: '',
  start_date: '',
  ticket_price: '',
  ticket_quantity: '',
  status: 'published',
};

const inputClass = 'w-full px-5 py-4 mt-3 text-fg border rounded-3xl border-border bg-bg-elevated';

function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm);
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
        photo_urls: (form.photo_urls || []).filter(Boolean),
      });
      setMessage('Événement créé avec succès');
      setForm(emptyForm);
      setEvents((prev) => [response.event, ...prev]);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Impossible de créer l’événement');
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
      photo_urls: eventItem.photo_urls && eventItem.photo_urls.length ? eventItem.photo_urls : [],
      video_url: eventItem.video_url || '',
      latitude: eventItem.latitude ?? '',
      longitude: eventItem.longitude ?? '',
      ticket_price: eventItem.ticket_price || 0,
      ticket_quantity: eventItem.ticket_quantity || 0,
      status: eventItem.status || 'published',
    });
    setEditMessage('');
  };

  const handleEditChange = (name, value) => {
    setEditForm((prev) => ({ ...prev, [name]: value }));
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
      setMessage('Événement mis à jour avec succès');
      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      setEditMessage(err.response?.data?.message || 'Impossible de mettre à jour l’événement');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditMessage('');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
      <div className="glass-card rounded-[36px] border border-border p-8">
        <h1 className="text-4xl font-semibold text-fg">Admin event manager</h1>
        <p className="mt-3 text-muted">Créez et gérez les événements de la plateforme K-MER.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="glass-card rounded-[36px] border border-border p-8">
          <h2 className="text-2xl font-semibold text-fg">Créer un nouvel événement</h2>
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-muted">
                Titre
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
              </label>
              <label className="block text-muted">
                Catégorie
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-muted">
                Ville
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} />
              </label>
              <label className="block text-muted">
                Lieu
                <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className={inputClass} />
              </label>
            </div>

            <label className="block text-muted">
              Organisateur
              <input value={form.organizer} onChange={(e) => setForm({ ...form, organizer: e.target.value })} className={inputClass} />
            </label>

            <label className="block text-muted">
              Description
              <textarea rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
            </label>

            <ImageUploader
              label="Bannière de l’événement"
              value={form.banner_url}
              onChange={(v) => setForm((s) => ({ ...s, banner_url: v }))}
            />

            <VideoUploader
              label="Vidéo de l’événement (optionnel)"
              value={form.video_url}
              onChange={(v) => setForm((s) => ({ ...s, video_url: v }))}
            />

            <LocationPicker
              latitude={form.latitude}
              longitude={form.longitude}
              venue={form.venue}
              city={form.city}
              onChange={(field, value) => setForm((s) => ({ ...s, [field]: value }))}
              inputClass={inputClass}
            />

            <ImageUploader
              label="Galerie photo"
              multiple
              value={form.photo_urls}
              onChange={(v) => setForm((s) => ({ ...s, photo_urls: v }))}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-muted">
                Date de début
                <input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputClass} />
              </label>
              <label className="block text-muted">
                Nombre de places
                <input type="number" min="1" value={form.ticket_quantity} onChange={(e) => setForm({ ...form, ticket_quantity: e.target.value })} className={inputClass} />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-muted">
                Prix
                <input type="number" step="0.01" value={form.ticket_price} onChange={(e) => setForm({ ...form, ticket_price: e.target.value })} className={inputClass} />
              </label>
              <label className="block text-muted">
                Statut
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
                  <option value="published">Published</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>

            {message ? <p className="text-sm text-primary">{message}</p> : null}
            <button type="submit" className="px-6 py-4 text-sm font-semibold transition rounded-full bg-primary text-primary-fg hover:bg-primary-hover">
              Créer l’événement
            </button>
          </form>
        </section>

        <section className="glass-card rounded-[36px] border border-border p-8">
          <h2 className="text-2xl font-semibold text-fg">Événements actuels</h2>
          <div className="mt-6 space-y-4">
            {events.map((eventItem) => {
              const soldCount = eventItem.sold_tickets ?? (eventItem.ticket_quantity - eventItem.remaining_tickets);
              return (
                <div key={eventItem.id} className="p-5 border rounded-3xl border-border bg-surface">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.25em] text-primary">{eventItem.category}</p>
                      <h3 className="text-xl font-semibold text-fg">{eventItem.title}</h3>
                      <p className="text-sm text-muted">
                        {eventItem.city} · {eventItem.start_date ? new Date(eventItem.start_date).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {eventItem.status === 'pending' ? (
                        <>
                          <button onClick={() => approve(eventItem.id)} className="px-4 py-2 text-sm font-semibold text-primary-fg transition rounded-full bg-primary hover:bg-primary-hover">
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
                        Supprimer
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 mt-4 sm:grid-cols-3">
                    <div className="p-4 border rounded-3xl border-border bg-surface-hover">
                      <p className="text-sm uppercase tracking-[0.25em] text-subtle">Places vendues</p>
                      <p className="mt-2 text-lg font-semibold text-fg">{soldCount}</p>
                    </div>
                    <div className="p-4 border rounded-3xl border-border bg-surface-hover">
                      <p className="text-sm uppercase tracking-[0.25em] text-subtle">Places restantes</p>
                      <p className="mt-2 text-lg font-semibold text-fg">{eventItem.remaining_tickets}</p>
                    </div>
                    <div className="p-4 border rounded-3xl border-border bg-surface-hover">
                      <p className="text-sm uppercase tracking-[0.25em] text-subtle">Total places</p>
                      <p className="mt-2 text-lg font-semibold text-fg">{eventItem.ticket_quantity}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4 text-sm text-muted">
                    <span>{eventItem.video_url ? 'Vidéo configurée' : 'Image configurée'}</span>
                    <span>·</span>
                    <span>{eventItem.buyers?.length ? `${eventItem.buyers.length} acheteur(s)` : 'Aucun acheteur encore'}</span>
                  </div>

                  {eventItem.buyers?.length > 0 ? (
                    <p className="mt-3 text-sm text-muted">Acheteurs : {eventItem.buyers.join(', ')}</p>
                  ) : null}

                  {editingId === eventItem.id && editForm ? (
                    <div className="p-6 mt-6 space-y-4 border rounded-3xl border-border bg-bg-elevated">
                      <h4 className="text-lg font-semibold text-fg">Modifier l’événement</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block text-muted">
                          Titre
                          <input value={editForm.title} onChange={(e) => handleEditChange('title', e.target.value)} className={inputClass} />
                        </label>
                        <label className="block text-muted">
                          Catégorie
                          <input value={editForm.category} onChange={(e) => handleEditChange('category', e.target.value)} className={inputClass} />
                        </label>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block text-muted">
                          Ville
                          <input value={editForm.city} onChange={(e) => handleEditChange('city', e.target.value)} className={inputClass} />
                        </label>
                        <label className="block text-muted">
                          Lieu
                          <input value={editForm.venue} onChange={(e) => handleEditChange('venue', e.target.value)} className={inputClass} />
                        </label>
                      </div>

                      <label className="block text-muted">
                        Organisateur
                        <input value={editForm.organizer} onChange={(e) => handleEditChange('organizer', e.target.value)} className={inputClass} />
                      </label>

                      <label className="block text-muted">
                        Description
                        <textarea rows="4" value={editForm.description} onChange={(e) => handleEditChange('description', e.target.value)} className={inputClass} />
                      </label>

                      <ImageUploader
                        label="Bannière de l’événement"
                        value={editForm.banner_url}
                        onChange={(v) => handleEditChange('banner_url', v)}
                      />

                      <VideoUploader
                        label="Vidéo de l’événement (optionnel)"
                        value={editForm.video_url}
                        onChange={(v) => handleEditChange('video_url', v)}
                      />

                      <LocationPicker
                        latitude={editForm.latitude}
                        longitude={editForm.longitude}
                        venue={editForm.venue}
                        city={editForm.city}
                        onChange={handleEditChange}
                        inputClass={inputClass}
                      />

                      <ImageUploader
                        label="Galerie photo"
                        multiple
                        value={editForm.photo_urls}
                        onChange={(v) => handleEditChange('photo_urls', v)}
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block text-muted">
                          Nombre de places
                          <input type="number" min="1" value={editForm.ticket_quantity} onChange={(e) => handleEditChange('ticket_quantity', e.target.value)} className={inputClass} />
                        </label>
                        <label className="block text-muted">
                          Prix
                          <input type="number" step="0.01" value={editForm.ticket_price} onChange={(e) => handleEditChange('ticket_price', e.target.value)} className={inputClass} />
                        </label>
                      </div>

                      {editMessage ? <p className="text-sm text-primary">{editMessage}</p> : null}

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <button onClick={() => saveEdit(eventItem.id)} type="button" className="px-6 py-3 text-sm font-semibold transition rounded-full bg-primary text-primary-fg hover:bg-primary-hover">
                          Enregistrer
                        </button>
                        <button onClick={cancelEdit} type="button" className="px-6 py-3 text-sm font-semibold text-fg transition border rounded-full border-border hover:border-primary">
                          Annuler
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
