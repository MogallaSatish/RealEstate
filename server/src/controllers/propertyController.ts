import type { Request, Response } from "express";
import { Property } from "../models/Property.js";
import { Favorite } from "../models/Favorite.js";
import { Review } from "../models/Review.js";
import { User } from "../models/User.js";
import { AgentProfile } from "../models/AgentProfile.js";
import {
  createListing,
  publicPropertyQuery,
  recordView,
  serializeProperty,
  similarProperties,
  sortFromQuery,
  submitListing,
  updateListing,
  setListingAvailability,
  canManageListing,
} from "../services/propertyService.js";
import { destroyAsset, uploadBuffer } from "../integrations/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";

export const searchPublic = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(40, Math.max(1, Number(req.query.limit ?? 12)));
  const filter = publicPropertyQuery(req.query as Record<string, unknown>);
  const [items, total] = await Promise.all([
    Property.find(filter)
      .sort(sortFromQuery(String(req.query.sort ?? "")))
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("listedBy", "fullName role avatarUrl")
      .lean(),
    Property.countDocuments(filter),
  ]);
  res.json({ items: items.map((p) => serializeProperty(p)), total, page, pages: Math.ceil(total / limit) });
});

export const featured = asyncHandler(async (_req: Request, res: Response) => {
  const items = await Property.find({
    status: "published",
    approvalStatus: "approved",
    featuredUntil: { $gt: new Date() },
  })
    .sort({ featuredUntil: -1 })
    .limit(8)
    .lean();
  res.json({ items: items.map((p) => serializeProperty(p)) });
});

export const suggestions = asyncHandler(async (req: Request, res: Response) => {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 2) return res.json({ items: [] });
  const items = await Property.find({
    status: "published",
    approvalStatus: "approved",
    $or: [
      { title: new RegExp(q, "i") },
      { "location.locality": new RegExp(q, "i") },
      { "location.city": new RegExp(q, "i") },
    ],
  })
    .select("title slug location.city location.locality")
    .limit(8)
    .lean();
  res.json({ items });
});

export const publicDetail = asyncHandler(async (req: Request, res: Response) => {
  const property = await Property.findOne({
    slug: req.params.slug,
    status: "published",
    approvalStatus: "approved",
  })
    .populate("listedBy", "fullName role avatarUrl")
    .lean();
  if (!property) throw notFound("Property not found");
  await recordView(String(property._id), req.user?.id);
  const [similar, reviews, agent] = await Promise.all([
    similarProperties(String(property._id)),
    Review.find({ propertyId: property._id, published: true }).limit(10).lean(),
    AgentProfile.findOne({ userId: property.listedBy }).lean(),
  ]);
  res.json({
    property: serializeProperty(property),
    similar: similar.map((p) => serializeProperty(p)),
    reviews,
    agent,
    mapsKeyConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY),
  });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const listing = await createListing(req.user!, req.body);
  res.status(201).json({ listing });
});

export const mine = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = req.user!.role === "admin" ? {} : { listedBy: req.user!.id };
  if (req.query.status) filter.status = req.query.status;
  const items = await Property.find(filter).sort({ updatedAt: -1 }).lean();
  res.json({ items });
});

export const getMine = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Property.findById(req.params.id);
  if (!listing) throw notFound();
  if (!canManageListing(String(listing.listedBy), req.user!)) throw forbidden();
  res.json({ listing });
});

export const patch = asyncHandler(async (req: Request, res: Response) => {
  const listing = await updateListing(req.params.id, req.user!, req.body);
  res.json({ listing });
});

export const submit = asyncHandler(async (req: Request, res: Response) => {
  const listing = await submitListing(req.params.id, req.user!);
  res.json({ listing });
});

export const availability = asyncHandler(async (req: Request, res: Response) => {
  const listing = await setListingAvailability(req.params.id, req.user!, req.body.status);
  res.json({ listing });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Property.findById(req.params.id);
  if (!listing) throw notFound();
  if (!canManageListing(String(listing.listedBy), req.user!)) throw forbidden();
  listing.status = "unavailable";
  await listing.save();
  res.json({ ok: true });
});

export const uploadImages = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Property.findById(req.params.id);
  if (!listing) throw notFound();
  if (!canManageListing(String(listing.listedBy), req.user!)) throw forbidden();
  const files = (req.files as Express.Multer.File[]) ?? [];
  if (!files.length) throw badRequest("No files uploaded");
  for (const file of files) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      throw badRequest("Only JPEG, PNG, and WebP images are allowed");
    }
    if (file.size > 8 * 1024 * 1024) throw badRequest("Each image must be under 8MB");
    const uploaded = await uploadBuffer(file.buffer, "estatehub/properties");
    listing.images.push({
      url: uploaded.url,
      publicId: uploaded.publicId,
      isCover: listing.images.length === 0,
      order: listing.images.length,
      kind: "photo",
    });
  }
  await listing.save();
  res.json({ listing, cloudinarySandbox: !process.env.CLOUDINARY_CLOUD_NAME });
});

export const deleteImage = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Property.findById(req.params.id);
  if (!listing) throw notFound();
  if (!canManageListing(String(listing.listedBy), req.user!)) throw forbidden();
  const img = listing.images.id(req.params.imageId);
  if (!img) throw notFound("Image not found");
  await destroyAsset(img.publicId);
  img.deleteOne();
  await listing.save();
  res.json({ listing });
});

export const reorderImages = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Property.findById(req.params.id);
  if (!listing) throw notFound();
  if (!canManageListing(String(listing.listedBy), req.user!)) throw forbidden();
  const order = req.body.order as string[];
  listing.images.forEach((img) => {
    const idx = order.indexOf(String(img._id));
    if (idx >= 0) img.order = idx;
    img.isCover = idx === 0;
  });
  listing.images.sort((a, b) => a.order - b.order);
  await listing.save();
  res.json({ listing });
});

export const toggleFavorite = asyncHandler(async (req: Request, res: Response) => {
  const existing = await Favorite.findOne({ userId: req.user!.id, propertyId: req.params.id });
  if (existing) {
    await existing.deleteOne();
    return res.json({ saved: false });
  }
  await Favorite.create({ userId: req.user!.id, propertyId: req.params.id });
  res.json({ saved: true });
});

export const myFavorites = asyncHandler(async (req: Request, res: Response) => {
  const items = await Favorite.find({ userId: req.user!.id }).populate("propertyId").sort({ createdAt: -1 }).lean();
  res.json({ items });
});

export const homeSections = asyncHandler(async (_req: Request, res: Response) => {
  const base = { status: "published", approvalStatus: "approved" };
  const [latest, vijayawada, commercial, rentals, verified, agents] = await Promise.all([
    Property.find(base).sort({ createdAt: -1 }).limit(8).lean(),
    Property.find({ ...base, "location.city": "Vijayawada" }).limit(8).lean(),
    Property.find({
      ...base,
      propertyType: { $in: ["commercial_building", "commercial_shop", "office_space", "warehouse"] },
    })
      .limit(6)
      .lean(),
    Property.find({ ...base, purpose: "rent" }).limit(6).lean(),
    Property.find({ ...base, verificationStatus: "verified" }).limit(6).lean(),
    User.find({ role: "agent", status: "active" }).limit(6).lean(),
  ]);
  const agentProfiles = await AgentProfile.find({ userId: { $in: agents.map((a) => a._id) } }).lean();
  res.json({
    latest: latest.map((p) => serializeProperty(p)),
    vijayawada: vijayawada.map((p) => serializeProperty(p)),
    commercial: commercial.map((p) => serializeProperty(p)),
    rentals: rentals.map((p) => serializeProperty(p)),
    verified: verified.map((p) => serializeProperty(p)),
    agents: agents.map((a) => ({
      ...a,
      profile: agentProfiles.find((p) => String(p.userId) === String(a._id)),
    })),
  });
});
