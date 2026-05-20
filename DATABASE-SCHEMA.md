# Database Schema

## Users

- `id` UUID PK
- `name`
- `email`
- `password`
- `role` ENUM('user','admin')
- `avatar_url`

## Events

- `id` UUID PK
- `title`
- `description`
- `category`
- `venue`
- `city`
- `organizer`
- `banner_url`
- `start_date`
- `end_date`
- `ticket_price`
- `ticket_quantity`
- `remaining_tickets`
- `status`
- `tags` JSON
- `social_links` JSON

## Bookings

- `id` UUID PK
- `booking_number`
- `user_id` FK -> users.id
- `event_id` FK -> events.id
- `quantity`
- `total_price`
- `status`
- `qr_code_url`

## BookingItem

- `id` UUID PK
- `booking_id` FK -> bookings.id
- `ticket_type`
- `price`
- `quantity`
