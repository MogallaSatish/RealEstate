# Database documentation

EstateHub uses **MongoDB Atlas only**, accessed through **Mongoose**. Relationships are application-enforced. Atlas does not provide relational foreign keys.

## Collections

| Collection | Purpose |
| --- | --- |
| users | Accounts, roles, status, email verification |
| userprofiles | Extended profile for all users |
| agentprofiles | License, experience, service areas |
| agencies | Brokerages |
| agencymembers | Agency membership |
| properties | Listings (pricing in paise, nested images and location) |
| propertyimages | Optional image rows when not embedded |
| amenities | Amenity catalog |
| propertyamenities | Property ↔ amenity |
| favorites | Saved listings |
| inquiries | Leads |
| appointments | Visit bookings |
| notifications | In-app alerts |
| reviews | Property/agent reviews |
| reports | Listing/user reports |
| conversations | Message threads |
| messages | Chat messages |
| payments | UPI platform charges |
| subscriptionplans | Paid packages |
| usersubscriptions | Active entitlements |
| propertyviews | Recently viewed / analytics |
| passwordresettokens | Hashed reset tokens |
| emailverificationtokens | Hashed verify tokens |
| auditlogs | Admin and payment-sensitive actions |
| platformsettings | Singleton site configuration |

## Indexes (high value)

- `users`: unique email, unique mobile, role+status
- `properties`: text on title/description/locality; compound purpose+city+approval+status; slug unique; featuredUntil; listedBy
- `inquiries`: propertyId+createdAt, recipientId+status
- `appointments`: propertyId+scheduledAt; unique sparse on confirmed slot
- `payments`: unique merchantRef; userId+createdAt
- `messages`: conversationId+createdAt

## Amounts

Store money as integer paise. Example: ₹75,00,000 = `750000000` paise.

## Retention

- Property views older than 180 days may be archived by the cleanup job.
- Expired pending payments older than 24 hours are marked `expired`.
- Audit logs are retained; do not delete from the application UI.

## Example property document

```json
{
  "title": "3 BHK Apartment in Benz Circle",
  "slug": "3-bhk-apartment-benz-circle-vijayawada",
  "purpose": "buy",
  "propertyType": "apartment",
  "status": "published",
  "approvalStatus": "approved",
  "pricing": { "salePricePaise": 850000000, "negotiable": true, "currency": "INR" },
  "location": { "city": "Vijayawada", "state": "Andhra Pradesh", "country": "India" },
  "isDemo": true
}
```

## Analytics aggregations

Admin overview uses `$facet` pipelines: counts by role, listing status, purpose, city, and successful payment totals.
