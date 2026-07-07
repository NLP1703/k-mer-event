import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  fetchEvents,
  createEvent,
  deleteEvent,
  updateEvent,
  fetchOrganizerEventBookings,
  updateOrganizerBookingStatus,
} from '../services/api.js';
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
  status: 'pending',
};

const inputClass = 'w-full px-5 py-4 mt-3 text-fg border rounded-3xl border-border bg-bg-elevated';

function OrganizerEvents() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editMessage, setEditMessage] = useState('');
  // Attendee list state, keyed by the currently expanded event id.
  const [attendeesId, setAttendeesId] = useState(null);
  const [attendees, setAttendees] = useState(null);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeesError, setAttendeesError] = useState('');

  const loadEvents = async () => {
    // Ownership is enforced server-side by authorizeEventOwner on update/delete.
    // The DB schema has no reliable organizer_id column, so we list all and rely on backend constraints.
    const response = await fetchEvents({ admin: false });
    setEvents(response.events || []);
  };

  useEffect(() => {
    loadEvents().catch(console.error);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await createEvent({
        ...form,
        ticket_price: Number(form.ticket_price) || 0,
        ticket_quantity: Number(form.ticket_quantity) || 0,
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
    const ok = window.confirm(
      'Supprimer définitivement cet événement ? Les réservations et billets liés seront aussi supprimés. Cette action est irréversible.',
    );
    if (!ok) return;
    try {
      await deleteEvent(eventId);
      setEvents((prev) => prev.filter((event) => event.id !== eventId));
      setMessage('Événement supprimé.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Suppression impossible. Réessayez.');
    }
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
      status: eventItem.status || 'pending',
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
        ticket_price: Number(editForm.ticket_price) || 0,
        ticket_quantity: Number(editForm.ticket_quantity) || 0,
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

  const toggleAttendees = async (eventId) => {
    // Second click on the same event collapses the panel.
    if (attendeesId === eventId) {
      setAttendeesId(null);
      setAttendees(null);
      setAttendeesError('');
      return;
    }
    setAttendeesId(eventId);
    setAttendees(null);
    setAttendeesError('');
    setAttendeesLoading(true);
    try {
      const data = await fetchOrganizerEventBookings(eventId);
      setAttendees(data);
    } catch (err) {
      setAttendeesError(err.response?.data?.message || 'Impossible de charger les participants');
    } finally {
      setAttendeesLoading(false);
    }
  };

  // Confirm a Mobile Money payment (pending → confirmed) or cancel/reject it.
  const changeBookingStatus = async (eventId, bookingId, status) => {
    try {
      await updateOrganizerBookingStatus(eventId, bookingId, status);
      setAttendees((prev) =>
        prev
          ? {
              ...prev,
              bookings: prev.bookings.map((b) =>
                b.id === bookingId ? { ...b, status, payment_pending: status === 'pending' } : b,
              ),
            }
          : prev,
      );
    } catch (err) {
      setAttendeesError(err.response?.data?.message || 'Impossible de mettre à jour la réservation');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
      <div className="bg-surface shadow-card rounded-2xl border border-border p-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-fg md:text-4xl">Mes événements</h1>
        <p className="mt-3 text-muted">Créez, modifiez et supprimez uniquement vos propres événements.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="bg-surface shadow-card rounded-2xl border border-border p-8">
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
                Nombre de places (max 250)
                <input type="number" min="0" max="250" placeholder="Laisser vide si pas de billetterie" value={form.ticket_quantity} onChange={(e) => setForm({ ...form, ticket_quantity: e.target.value })} className={inputClass} />
              </label>
            </div>

            <p className="text-xs text-subtle">Billetterie facultative : laissez le nombre de places et le prix vides si l’événement n’a pas de billetterie (entrée libre).</p>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-muted">
                Prix (optionnel)
                <input type="number" step="0.01" min="0" placeholder="0 = gratuit" value={form.ticket_price} onChange={(e) => setForm({ ...form, ticket_price: e.target.value })} className={inputClass} />
              </label>
              <label className="block text-muted">
                Statut
                <input type="hidden" name="status" value="pending" />
                <p className="mt-3 font-semibold text-fg">En attente de validation (pending)</p>
              </label>
            </div>

            {message ? <p className="text-sm text-primary">{message}</p> : null}
            <button type="submit" className="px-6 py-4 text-sm font-semibold transition rounded-full bg-primary text-primary-fg hover:bg-primary-hover">
              Soumettre l’événement
            </button>
          </form>
        </section>

        <section className="bg-surface shadow-card rounded-2xl border border-border p-8">
          <h2 className="text-2xl font-semibold text-fg">Vos événements</h2>
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
                    <div className="flex flex-wrap items-center gap-3">
                      <button onClick={() => toggleAttendees(eventItem.id)} className="px-4 py-2 text-sm font-semibold text-white transition rounded-full bg-primary hover:bg-primary-hover">
                        {attendeesId === eventItem.id ? 'Masquer les participants' : 'Participants'}
                      </button>
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

                  {attendeesId === eventItem.id ? (
                    <div className="p-6 mt-6 space-y-4 border rounded-3xl border-border bg-bg-elevated">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h4 className="text-lg font-semibold text-fg">Participants (billets vendus)</h4>
                        {attendees ? (
                          <p className="text-sm text-muted">
                            {attendees.count} réservation{attendees.count > 1 ? 's' : ''} ·{' '}
                            {attendees.total_tickets} place{attendees.total_tickets > 1 ? 's' : ''}
                          </p>
                        ) : null}
                      </div>
                      <p className="text-xs text-subtle">
                        Comparez le nom et le n° de billet ci-dessous avec ceux affichés à l’écran lors du scan du QR code. Confirmez le paiement Mobile Money reçu pour valider un billet en attente.
                      </p>

                      {attendeesLoading ? (
                        <p className="text-sm text-muted">Chargement…</p>
                      ) : attendeesError ? (
                        <p className="text-sm text-rose-500">{attendeesError}</p>
                      ) : attendees && attendees.bookings.length ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left border-collapse">
                            <thead>
                              <tr className="text-xs uppercase tracking-wider text-subtle">
                                <th className="py-2 pr-4 font-medium">Nom</th>
                                <th className="py-2 pr-4 font-medium">N° de billet</th>
                                <th className="py-2 pr-4 font-medium">Places</th>
                                <th className="py-2 pr-4 font-medium">Montant</th>
                                <th className="py-2 pr-4 font-medium">Paiement</th>
                                <th className="py-2 pr-4 font-medium">Entrée</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {attendees.bookings.map((b) => (
                                <tr key={b.id} className="align-top">
                                  <td className="py-2.5 pr-4 font-medium text-fg">
                                    {b.attendee.name}
                                    {b.attendee.email ? (
                                      <span className="block text-xs font-normal text-subtle">{b.attendee.email}</span>
                                    ) : null}
                                    {b.attendee.phone ? (
                                      <span className="block text-xs font-normal text-subtle">{b.attendee.phone}</span>
                                    ) : null}
                                  </td>
                                  <td className="py-2.5 pr-4 font-mono text-xs text-fg break-all">
                                    {b.booking_number}
                                    {b.created_at ? (
                                      <span className="block font-sans text-subtle">
                                        Réservé le{' '}
                                        {new Date(b.created_at).toLocaleString('fr-FR', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    ) : null}
                                  </td>
                                  <td className="py-2.5 pr-4 text-muted">{b.quantity}</td>
                                  <td className="py-2.5 pr-4 text-fg whitespace-nowrap">
                                    FCFA {(Number(b.amount) || 0).toFixed(0)}
                                  </td>
                                  <td className="py-2.5 pr-4">
                                    {b.status === 'cancelled' ? (
                                      <span className="text-rose-500">Annulé</span>
                                    ) : b.status === 'pending' ? (
                                      <div className="flex flex-col gap-2">
                                        <span className="text-amber-500">En attente</span>
                                        {b.payment_proof_url ? (
                                          <a
                                            href={b.payment_proof_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-24 overflow-hidden border rounded-lg border-border hover:border-primary"
                                            title="Voir la preuve de paiement"
                                          >
                                            <img
                                              src={b.payment_proof_url}
                                              alt="Preuve de paiement"
                                              className="object-cover w-24 h-16"
                                            />
                                          </a>
                                        ) : (
                                          <span className="text-xs text-subtle">Aucune preuve envoyée</span>
                                        )}
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => changeBookingStatus(eventItem.id, b.id, 'confirmed')}
                                            className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-400"
                                          >
                                            Confirmer
                                          </button>
                                          <button
                                            onClick={() => changeBookingStatus(eventItem.id, b.id, 'cancelled')}
                                            className="rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-rose-400"
                                          >
                                            Refuser
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-1">
                                        <span className="text-emerald-500">Payé</span>
                                        {b.payment_proof_url ? (
                                          <a
                                            href={b.payment_proof_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs underline text-muted hover:text-primary"
                                          >
                                            Voir la preuve
                                          </a>
                                        ) : null}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 pr-4">
                                    {b.status === 'cancelled' ? (
                                      <span className="text-rose-500">Annulé</span>
                                    ) : b.checked_in ? (
                                      <span className="text-emerald-500">
                                        Validé{b.checked_in_at ? ` · ${new Date(b.checked_in_at).toLocaleString('fr-FR')}` : ''}
                                      </span>
                                    ) : (
                                      <span className="text-subtle">Pas encore</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted">Aucun billet vendu pour le moment.</p>
                      )}
                    </div>
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
                          Nombre de places (max 250)
                          <input type="number" min="0" max="250" placeholder="Vide = pas de billetterie" value={editForm.ticket_quantity} onChange={(e) => handleEditChange('ticket_quantity', e.target.value)} className={inputClass} />
                        </label>
                        <label className="block text-muted">
                          Prix (optionnel)
                          <input type="number" step="0.01" min="0" placeholder="0 = gratuit" value={editForm.ticket_price} onChange={(e) => handleEditChange('ticket_price', e.target.value)} className={inputClass} />
                        </label>
                      </div>

                      {editMessage ? <p className="text-sm text-primary">{editMessage}</p> : null}

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <button onClick={() => saveEdit(eventItem.id)} type="button" className="px-6 py-3 text-sm font-semibold transition rounded-full bg-primary text-primary-fg hover:bg-primary-hover">
                          Confirmer
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

export default OrganizerEvents;
