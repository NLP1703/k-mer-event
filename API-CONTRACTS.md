# API Contracts

## Auth

- `POST /api/auth/register`
  - body: `{ name, email, password }`
  - response: `{ user, token }`

- `POST /api/auth/login`
  - body: `{ email, password }`
  - response: `{ user, token }`

- `GET /api/auth/me`
  - headers: `Authorization: Bearer <token>`
  - response: `{ user }`

## Events

- `GET /api/events`
  - query: `search`, `city`, `category`, `status`
  - response: `{ events }`

- `GET /api/events/:id`
  - response: `{ event }`

- `POST /api/events`
  - auth: admin
  - body: event fields
  - response: `{ event }`

- `PUT /api/events/:id`
  - auth: admin
  - response: `{ event }`

- `DELETE /api/events/:id`
  - auth: admin
  - response: 204

## Bookings

- `POST /api/bookings`
  - auth: user
  - body: `{ eventId, quantity }`
  - response: `{ booking }`

- `GET /api/bookings`
  - auth: user
  - response: `{ bookings }`

- `GET /api/bookings/:id`
  - auth: user
  - response: `{ booking }`

## Dashboard

- `GET /api/dashboard`
  - auth: admin
  - response: `{ totalUsers, totalEvents, totalBookings, revenue, topEvents }`
