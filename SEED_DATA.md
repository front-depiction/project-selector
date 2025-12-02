# Seeding Test Data for Allow-List Testing

This guide shows you how to create sample data to test the email allow-list functionality.

## Quick Setup

### Using the Admin UI (Recommended)

1. Go to **Admin Dashboard** → **Settings** tab
2. Click **"Seed Data"** button in the "Development Tools" section

This single action will:

- Create 10 topics (7 regular + 3 restricted)
- Create an open selection period for Spring 2024
- Add 5 sample emails to the allow-list
- Generate 60 test students with preferences

### Using Convex Dashboard Functions

1. Go to your [Convex Dashboard](https://dashboard.convex.dev)
2. Navigate to your deployment
3. Go to **Functions** tab
4. Run: `admin:seedTestData`

### Using Convex CLI

```bash
npx convex run admin:seedTestData
```

## What Gets Created

### Topics Created

**Regular Topics (No Allow-List Required):**

1. Machine Learning Recommendation System
2. Mobile AR Gaming Application
3. Cloud-Native Microservices
4. Natural Language Processing Chatbot
5. IoT Smart Home System
6. Cybersecurity Threat Detection
7. Data Visualization Dashboard

**Restricted Topics (Require Allow-List):**

1. Blockchain Smart Contracts [RESTRICTED]
2. Computer Vision for Medical Imaging [RESTRICTED]
3. Quantum Computing Algorithms [RESTRICTED]

### Allow-List Emails Added

- `student1@university.edu`
- `student2@university.edu`
- `test@example.com`
- `demo@test.com`
- `allowed@student.edu`

## Testing the Allow-List

1. **Log in with an email NOT on the allow-list**:
   - You should see only the 7 regular topics
   - The 3 restricted topics should be hidden

2. **Add your email to the allow-list**:
   - Go to Convex Dashboard → Functions
   - Run: `users:addToAllowList` with your email
   - Or use: `users:bulkAddToAllowList` with an array of emails

3. **Log out and log back in** (or refresh):
   - You should now see all 10 topics (7 regular + 3 restricted)

## Managing the Allow-List

### Add a single email:

```javascript
// In Convex Dashboard Functions tab
users:addToAllowList
{
  "email": "your-email@example.com",
  "note": "Optional note"
}
```

### Add multiple emails:

```javascript
users:bulkAddToAllowList
{
  "emails": ["email1@example.com", "email2@example.com"],
  "note": "Batch import"
}
```

### Remove an email:

```javascript
users:removeFromAllowList
{
  "email": "email@example.com"
}
```

### View all allow-list entries:

```javascript
// Query (read-only)
users: getAllowList;
```

## Notes

- Topics with `requiresAllowList: true` are only visible to users whose email is in the allow-list
- The filtering happens **server-side** in Convex queries, so it's secure
- Users are automatically checked against the allow-list when they log in
- You can update a user's `isAllowed` status by adding/removing their email from the allow-list
