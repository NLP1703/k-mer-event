# TODO (Admin/Organizer permissions)

## Status
- Backend authorization already matches requirements (admin full access, organizer only own events + admin validation).

## Checks (manual)
- [ ] Verify organizer cannot update/delete events of other organizers (authorizeEventOwner)
- [ ] Verify organizer cannot publish events directly (createEvent sets organizer events to `pending`; only admin endpoints approve/cancel)
- [ ] Verify organizer can only list/delete bookings for events they own (organizerEventsController)
- [ ] Verify admin endpoints are protected by `authorize('admin')`

## Notes
- If frontend exposes “admin approval” actions to organizer users, UI should also hide them (backend is the source of truth).

