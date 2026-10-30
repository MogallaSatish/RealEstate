import mongoose from "mongoose";
import { Property } from "../models/Property.js";
import { PropertyView } from "../models/PropertyView.js";
import { makeSlug } from "../utils/slug.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";
import { rupeesToPaise } from "../utils/money.js";
import type { UserRole } from "../types/enums.js";

const PUBLIC_FILTER = { status: "published", approvalStatus: "approved" };

export function canManageListing(
  listedBy: string,
  user: { id: string; role: UserRole },
) {
  if (user.role === "admin") return true;
  return listedBy === user.id;
}

export async function createListing(user: { id: string; role: UserRole }, body: Record<string, unknown>) {
  if (!["owner", "agent", "admin"].includes(user.role)) throw forbidden();
  const title = String(body.title ?? "Untitled property");
  const slug = makeSlug(title, Date.now().toString(36));
  const doc = await Property.create({
    title,
    slug,
    description: body.description ?? "",
    propertyType: body.propertyType,
    purpose: body.purpose,
    listingType: body.listingType ?? (body.purpose === "buy" ? "sale" : body.purpose),
    ownershipType: body.ownershipType ?? "freehold",
    location: body.location,
    specs: body.specs ?? {},
    pricing: normalizePricing(body.pricing as Record<string, number> | undefined, String(body.purpose)),
    amenities: body.amenities ?? [],
    listedBy: user.id,
    listedByRole: user.role === "admin" ? "owner" : user.role,
    status: "draft",
    approvalStatus: "pending",
    availabilityDate: body.availabilityDate,
    videoUrl: body.videoUrl ?? "",
  });
  return doc;
}

function normalizePricing(pricing: Record<string, number> | undefined, purpose: string) {
  const p = pricing ?? {};
  const toPaise = (v?: number) => (v ? (v > 100000000 ? v : rupeesToPaise(v)) : 0);
  return {
    currency: "INR",
    salePricePaise: purpose === "buy" ? toPaise(p.salePricePaise ?? p.salePrice) : 0,
    monthlyRentPaise: purpose === "rent" ? toPaise(p.monthlyRentPaise ?? p.monthlyRent) : 0,
    securityDepositPaise: toPaise(p.securityDepositPaise ?? p.securityDeposit),
    leaseAmountPaise: purpose === "lease" ? toPaise(p.leaseAmountPaise ?? p.leaseAmount) : 0,
    maintenancePaise: toPaise(p.maintenancePaise ?? p.maintenance),
    negotiable: p.negotiable !== undefined ? Boolean(p.negotiable) : true,
  };
}

export async function updateListing(
  id: string,
  user: { id: string; role: UserRole },
  body: Record<string, unknown>,
) {
  const listing = await Property.findById(id);
  if (!listing) throw notFound("Listing not found");
  if (!canManageListing(String(listing.listedBy), user)) throw forbidden();
  if (listing.status === "published" && user.role !== "admin") {
    listing.status = "pending";
    listing.approvalStatus = "pending";
  }
  const assignable = [
    "title",
    "description",
    "propertyType",
    "purpose",
    "listingType",
    "ownershipType",
    "location",
    "specs",
    "amenities",
    "videoUrl",
    "availabilityDate",
    "contactOverride",
  ];
  for (const key of assignable) {
    if (body[key] !== undefined) (listing as unknown as Record<string, unknown>)[key] = body[key];
  }
  if (body.pricing) listing.pricing = normalizePricing(body.pricing as Record<string, number>, listing.purpose);
  if (body.title) listing.slug = makeSlug(String(body.title), String(listing._id).slice(-6));
  await listing.save();
  return listing;
}

export async function submitListing(id: string, user: { id: string; role: UserRole }) {
  const listing = await Property.findById(id);
  if (!listing) throw notFound();
  if (!canManageListing(String(listing.listedBy), user)) throw forbidden();
  if (!listing.images.length) throw badRequest("Add at least one property image before submitting");
  listing.status = "pending";
  listing.approvalStatus = "pending";
  await listing.save();
  return listing;
}

export async function setListingAvailability(
  id: string,
  user: { id: string; role: UserRole },
  status: "sold" | "rented" | "leased" | "unavailable" | "published",
) {
  const listing = await Property.findById(id);
  if (!listing) throw notFound();
  if (!canManageListing(String(listing.listedBy), user)) throw forbidden();
  listing.status = status;
  await listing.save();
  return listing;
}

export function publicPropertyQuery(query: Record<string, unknown>) {
  const filter: Record<string, unknown> = { ...PUBLIC_FILTER };
  if (query.city) filter["location.city"] = new RegExp(`^${escapeRegex(String(query.city))}$`, "i");
  if (query.locality) filter["location.locality"] = new RegExp(escapeRegex(String(query.locality)), "i");
  if (query.purpose) filter.purpose = query.purpose;
  if (query.propertyType) filter.propertyType = query.propertyType;
  if (query.furnishing) filter["specs.furnishing"] = query.furnishing;
  if (query.availability) filter["specs.availability"] = query.availability;
  if (query.listedByRole) filter.listedByRole = query.listedByRole;
  if (query.verified === "true") filter.verificationStatus = "verified";
  if (query.bedrooms) filter["specs.bedrooms"] = { $gte: Number(query.bedrooms) };
  if (query.bathrooms) filter["specs.bathrooms"] = { $gte: Number(query.bathrooms) };
  if (query.parking) filter["specs.parking"] = { $gte: Number(query.parking) };
  if (query.minArea || query.maxArea) {
    filter["specs.builtUpAreaSqft"] = {
      ...(query.minArea ? { $gte: Number(query.minArea) } : {}),
      ...(query.maxArea ? { $lte: Number(query.maxArea) } : {}),
    };
  }
  if (query.amenities) {
    const list = String(query.amenities).split(",").filter(Boolean);
    if (list.length) filter.amenities = { $all: list };
  }
  const purpose = String(query.purpose ?? "");
  const priceField =
    purpose === "rent" ? "pricing.monthlyRentPaise" : purpose === "lease" ? "pricing.leaseAmountPaise" : "pricing.salePricePaise";
  if (query.minPrice || query.maxPrice) {
    filter[priceField] = {
      ...(query.minPrice ? { $gte: rupeesToPaise(Number(query.minPrice)) } : {}),
      ...(query.maxPrice ? { $lte: rupeesToPaise(Number(query.maxPrice)) } : {}),
    };
  }
  if (query.q) filter.$text = { $search: String(query.q) };
  if (query.featured === "true") filter.featuredUntil = { $gt: new Date() };
  return filter;
}

export function sortFromQuery(sort?: string) {
  switch (sort) {
    case "oldest":
      return { createdAt: 1 as const };
    case "price_asc":
      return { "pricing.salePricePaise": 1 as const, "pricing.monthlyRentPaise": 1 as const };
    case "price_desc":
      return { "pricing.salePricePaise": -1 as const, "pricing.monthlyRentPaise": -1 as const };
    case "area_desc":
      return { "specs.builtUpAreaSqft": -1 as const };
    case "popular":
      return { viewCount: -1 as const };
    default:
      return { featuredUntil: -1 as const, createdAt: -1 as const };
  }
}

export async function recordView(propertyId: string, userId?: string) {
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const dup = await PropertyView.findOne({
    propertyId,
    userId: userId || undefined,
    viewedAt: { $gte: since },
  }).lean();
  if (dup) return;
  await PropertyView.create({ propertyId, userId, viewedAt: new Date() });
  await Property.findByIdAndUpdate(propertyId, { $inc: { viewCount: 1 } });
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function serializeProperty(p: Record<string, unknown>, revealAddress = false) {
  const loc = { ...(p.location as Record<string, unknown>) };
  if (!revealAddress && loc.hideExactAddress) {
    delete loc.street;
    loc.postalCode = "";
  }
  return { ...p, id: String(p._id), location: loc };
}

export async function similarProperties(propertyId: string) {
  const current = await Property.findById(propertyId).lean();
  if (!current) return [];
  return Property.find({
    ...PUBLIC_FILTER,
    _id: { $ne: current._id },
    purpose: current.purpose,
    "location.city": current.location.city,
  })
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();
}

export function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}
