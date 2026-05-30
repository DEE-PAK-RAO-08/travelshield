# Database Schema

## ER Diagram

```mermaid
erDiagram
    User ||--o| UserProfile : has
    User ||--o| UserPreferences : has
    User ||--o{ RefreshToken : has
    User ||--o{ Alert : receives
    User ||--o{ EmergencyEvent : triggers
    User ||--o{ EmergencyContact : has
    User ||--o{ TravelHistory : has
    User ||--o{ SafetyScore : has
    User ||--o{ ChatMessage : sends
    User ||--o{ ActivityLog : generates

    User {
        uuid id PK
        string email UK
        string passwordHash
        string firstName
        string lastName
        enum role
        boolean isEmailVerified
        boolean isActive
        datetime createdAt
    }

    UserProfile {
        uuid id PK
        uuid userId FK UK
        string touristId UK
        string nationality
        datetime validUntil
        string blockchainHash
        float currentLat
        float currentLng
        string currentLocation
        boolean geoFenceActive
    }

    SafeZone {
        uuid id PK
        string name
        float latitude
        float longitude
        float radiusM
        int safetyScore
    }

    PointOfInterest {
        uuid id PK
        string name
        string type
        float latitude
        float longitude
    }

    Place {
        uuid id PK
        string name
        string category
        float rating
        int safetyScore
    }

    Alert {
        uuid id PK
        uuid userId FK
        string title
        string message
        enum type
        enum severity
        boolean isRead
    }

    EmergencyEvent {
        uuid id PK
        uuid userId FK
        enum status
        float latitude
        float longitude
    }

    EmergencyContact {
        uuid id PK
        uuid userId FK
        string name
        string phone
        boolean autoAlert
    }

    TravelHistory {
        uuid id PK
        uuid userId FK
        enum eventType
        string title
        string location
    }

    SafetyScore {
        uuid id PK
        uuid userId FK
        int overallScore
        float aiConfidence
    }

    ChatMessage {
        uuid id PK
        uuid userId FK
        string role
        string content
    }
```

## Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| users | email | Login lookup |
| users | role | Admin queries |
| refresh_tokens | token | Session refresh |
| alerts | userId, createdAt | User alert feed |
| travel_history | userId, createdAt | Timeline |
| safe_zones | lat, lng | Geo queries |
| places | safetyScore | Recommendations |

## Migrations

```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

## Seed Data

- Admin user: `admin@travelshield.ai`
- Demo user: `alex@travelshield.ai` with full profile
- 3 safe zones (Singapore)
- Sample alerts, travel history, places, emergency contacts
