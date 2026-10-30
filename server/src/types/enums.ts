export const USER_ROLES = ["buyer", "tenant", "owner", "agent", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["active", "suspended", "pending"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const PROPERTY_TYPES = [
  "apartment",
  "independent_house",
  "villa",
  "residential_plot",
  "commercial_building",
  "commercial_shop",
  "office_space",
  "agricultural_land",
  "farmhouse",
  "pg",
  "hostel",
  "warehouse",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_PURPOSES = ["buy", "rent", "lease"] as const;
export type PropertyPurpose = (typeof PROPERTY_PURPOSES)[number];

export const LISTING_TYPES = ["sale", "rent", "lease"] as const;
export const OWNERSHIP_TYPES = ["freehold", "leasehold", "cooperative", "power_of_attorney"] as const;
export const FURNISHING = ["furnished", "semi_furnished", "unfurnished"] as const;
export const AVAILABILITY = ["ready_to_move", "under_construction", "available"] as const;
export const FACING = ["north", "south", "east", "west", "north_east", "north_west", "south_east", "south_west"] as const;

export const PROPERTY_STATUS = [
  "draft",
  "pending",
  "published",
  "rejected",
  "sold",
  "rented",
  "leased",
  "unavailable",
  "suspended",
] as const;
export type PropertyStatus = (typeof PROPERTY_STATUS)[number];

export const APPROVAL_STATUS = ["pending", "approved", "rejected", "changes_requested"] as const;
export const VERIFICATION_STATUS = [
  "not_submitted",
  "pending_verification",
  "verified",
  "rejected",
  "suspended",
] as const;

export const INQUIRY_STATUS = ["new", "contacted", "interested", "visit_scheduled", "converted", "closed"] as const;
export const APPOINTMENT_STATUS = [
  "pending",
  "confirmed",
  "rejected",
  "rescheduled",
  "completed",
  "cancelled",
] as const;
export const PAYMENT_STATUS = [
  "pending",
  "processing",
  "successful",
  "failed",
  "expired",
  "refund_pending",
  "refunded",
] as const;

export const AMENITY_KEYS = [
  "lift",
  "swimming_pool",
  "gym",
  "security",
  "cctv",
  "power_backup",
  "water_supply",
  "parking",
  "garden",
  "clubhouse",
  "play_area",
  "air_conditioning",
  "internet",
  "gated_community",
] as const;
