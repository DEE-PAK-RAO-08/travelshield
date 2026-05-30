# TravelShield API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

All protected routes require header: `Authorization: Bearer <accessToken>`

### POST /auth/register
Register a new tourist account.

```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "Alex",
  "lastName": "Traveler"
}
```

### POST /auth/login
```json
{ "email": "alex@travelshield.ai", "password": "User@123456" }
```

Response:
```json
{
  "success": true,
  "data": {
    "user": { "id", "email", "firstName", "lastName", "role", "profile" },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### POST /auth/refresh
```json
{ "refreshToken": "..." }
```

### POST /auth/logout
Requires auth. Body: `{ "refreshToken": "..." }`

### POST /auth/forgot-password
```json
{ "email": "user@example.com" }
```

### POST /auth/reset-password
```json
{ "token": "uuid-token", "password": "newpassword" }
```

### POST /auth/verify-email
```json
{ "token": "uuid-token" }
```

### GET /auth/me
Returns current user profile.

---

## Dashboard & Safety

### GET /dashboard
Home dashboard data: safety score, location, nearby alerts.

### GET /safety-score
Current safety score breakdown.

### GET /map/nearby?lat=1.28&lng=103.86
Safe zones, POIs, location metrics.

### POST /map/safe-route
```json
{ "destinationLat": 1.285, "destinationLng": 103.858 }
```

---

## Places & Alerts

### GET /places?category=&search=&page=1&limit=10
Paginated safe places/restaurants.

### GET /alerts?type=&severity=&unreadOnly=true&page=1
### PATCH /alerts/:id/read
### PATCH /alerts/read-all

---

## Emergency

### POST /emergency/sos
```json
{ "latitude": 1.28, "longitude": 103.86, "location": "Marina Bay" }
```

### GET /emergency/contacts
### POST /emergency/contacts
```json
{ "name": "Sarah", "relationship": "Sister", "phone": "+1234567890" }
```

### DELETE /emergency/contacts/:id

---

## Profile & Chat

### GET /profile/digital-id
### GET /travel-history?period=today|yesterday|week|month
### GET /chat/messages
### POST /chat/messages
```json
{ "content": "Safe restaurants nearby" }
```

### GET /preferences
### PATCH /preferences
```json
{ "pushNotifications": true, "shareLocation": true }
```

---

## Admin (requires ADMIN role)

### GET /admin/analytics
### GET /admin/users?search=&page=1
### PATCH /admin/users/:id
```json
{ "isActive": false, "role": "USER" }
```

### POST /admin/alerts
Create global alert.

---

## Error Responses

```json
{ "success": false, "message": "Error description" }
```

Status codes: 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 409 (conflict), 500 (server)
