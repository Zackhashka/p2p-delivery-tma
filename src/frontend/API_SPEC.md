# P2P Delivery TMA - API Specification

Frontend expects these endpoints from backend API.

## Authentication

All requests include header:
```
Authorization: tma <initData>
```

Backend must validate `initData` with Telegram Bot API.

## Endpoints

### Trips

**GET /api/trips**
- Query params: `from`, `to`, `limit`, `sort`
- Response: `{ data: Trip[] }`

**GET /api/trips/:tripId**
- Response: `{ id, driver, fromLocation, toLocation, departureDate, availableWeight, pricePerKg, categories, status, description }`

**POST /api/trips**
- Body: `{ fromLocation, toLocation, departureDate, availableWeight, pricePerKg, categories[], description }`
- Response: `{ id, ... }`

### Requests

**GET /api/requests**
- Query params: `from`, `to`, `limit`, `sort`
- Response: `{ data: Request[] }`

**GET /api/requests/:requestId**
- Response: `{ id, requester, fromLocation, toLocation, deadline, weight, reward, type, category, description }`

**POST /api/requests**
- Body: `{ fromLocation, toLocation, deadline, weight, reward, type, category, description }`
- Response: `{ id, ... }`

### Deals

**GET /api/deals**
- Query params: `status`, `limit`
- Response: `{ data: Deal[] }`

**GET /api/deals/:dealId**
- Response: `{ id, fromLocation, toLocation, weight, price, status, sender, receiver, driver, createdAt, completedAt }`

**POST /api/deals**
- Body: `{ tripId?, requestId?, type }`
- Response: `{ id, ... }`

**PATCH /api/deals/:dealId/status**
- Body: `{ status }`
- Response: `{ id, status, ... }`

Status flow: `created` → `accepted` → `in_transit` → `delivered` → `completed`

### Profile

**GET /api/profile**
- Response: `{ id, telegramId, name, avatar, firstName, lastName, phone, bio, verified, rating, totalRatings, tripsCount, deliveriesCount, dealsCount, earnedTotal, lastActive }`

**PATCH /api/profile**
- Body: `{ firstName?, lastName?, phone?, bio? }`
- Response: `{ ... }`

### Stats

**GET /api/stats**
- Response: `{ activeTrips, pendingRequests, completedDeals, userRating }`

### Messages (optional)

**POST /api/messages**
- Body: `{ dealId, text }`

**GET /api/messages/:chatId**
- Response: `{ data: Message[] }`

### Ratings (optional)

**POST /api/ratings/:userId**
- Body: `{ rating, comment }`

## Data Models

### Trip
```typescript
{
  id: string
  driver: User
  fromLocation: string
  toLocation: string
  departureDate: ISO8601
  availableWeight: number (kg)
  pricePerKg: number
  categories: string[] // documents, fragile, food, tech, clothes, books, furniture, other
  status: 'active' | 'completed'
  description?: string
}
```

### Request
```typescript
{
  id: string
  requester: User
  fromLocation: string
  toLocation: string
  deadline: ISO8601
  weight: number (kg)
  reward: number (rubles)
  type: string // parcel, envelope, box, document, other
  category: string
  description?: string
  dealId?: string
}
```

### Deal
```typescript
{
  id: string
  fromLocation: string
  toLocation: string
  weight: number
  price: number
  status: 'created' | 'accepted' | 'in_transit' | 'delivered' | 'completed' | 'cancelled'
  sender?: User
  receiver?: User
  driver?: User
  createdAt: ISO8601
  completedAt?: ISO8601
}
```

### User
```typescript
{
  id: string
  telegramId: string
  name: string
  avatar?: string
  verified: boolean
  rating: number
  firstName?: string
  lastName?: string
  phone?: string
  bio?: string
}
```

### Stats
```typescript
{
  activeTrips: number
  pendingRequests: number
  completedDeals: number
  userRating: number
}
```

## Error Responses

All errors return JSON with status code:
```json
{
  "error": "message",
  "code": "ERROR_CODE"
}
```

Common status codes:
- `400` - Bad request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `500` - Server error

## Rate Limiting

Recommended:
- 60 requests per minute per user
- 1000 requests per minute per IP

## CORS

Allow requests from TMA domain:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```
