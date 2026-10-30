import type { Request, Response } from "express";
import { User } from "../models/User.js";
import { Property } from "../models/Property.js";
import { Amenity } from "../models/Amenity.js";
import { Inquiry } from "../models/Inquiry.js";
import { Appointment } from "../models/Appointment.js";
import { Payment } from "../models/Payment.js";
import { Report } from "../models/Report.js";
import { AuditLog } from "../models/AuditLog.js";
import { PlatformSetting } from "../models/PlatformSetting.js";
import { SubscriptionPlan } from "../models/SubscriptionPlan.js";
import { AgentProfile } from "../models/AgentProfile.js";
import { Agency } from "../models/Agency.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notFound } from "../utils/errors.js";
import { writeAudit } from "../services/audit.js";
import { notifyUser } from "../services/notify.js";

export const analytics = asyncHandler(async (_req: Request, res: Response) => {
  const [users, properties, payments] = await Promise.all([
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    Property.aggregate([
      {
        $facet: {
          status: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          purpose: [{ $group: { _id: "$purpose", count: { $sum: 1 } } }],
          cities: [{ $group: { _id: "$location.city", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }],
          types: [{ $group: { _id: "$propertyType", count: { $sum: 1 } } }],
        },
      },
    ]),
    Payment.aggregate([
      { $match: { status: "successful" } },
      { $group: { _id: null, revenuePaise: { $sum: "$amountPaise" }, count: { $sum: 1 } } },
    ]),
  ]);
  const inquiryCount = await Inquiry.countDocuments();
  const appointmentCount = await Appointment.countDocuments();
  res.json({
    users,
    properties: properties[0],
    revenue: payments[0] ?? { revenuePaise: 0, count: 0 },
    inquiryCount,
    appointmentCount,
  });
});

export const users = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.q) {
    filter.$or = [
      { fullName: new RegExp(String(req.query.q), "i") },
      { email: new RegExp(String(req.query.q), "i") },
    ];
  }
  const items = await User.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ items });
});

export const patchUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!user) throw notFound();
  await writeAudit({
    actorId: req.user!.id,
    action: "admin.user.update",
    entity: "User",
    entityId: String(user._id),
    metadata: req.body,
    ip: req.ip,
  });
  res.json({ user });
});

export const listings = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;
  if (req.query.status) filter.status = req.query.status;
  const items = await Property.find(filter).sort({ createdAt: -1 }).limit(100).populate("listedBy", "fullName email").lean();
  res.json({ items });
});

export const moderateListing = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Property.findById(req.params.id);
  if (!listing) throw notFound();
  const action = req.body.action as string;
  if (action === "approve") {
    listing.approvalStatus = "approved";
    listing.status = "published";
    listing.rejectionReason = "";
  } else if (action === "reject") {
    listing.approvalStatus = "rejected";
    listing.status = "rejected";
    listing.rejectionReason = req.body.reason ?? "";
  } else if (action === "changes") {
    listing.approvalStatus = "changes_requested";
    listing.status = "pending";
    listing.rejectionReason = req.body.reason ?? "";
  } else if (action === "suspend") {
    listing.status = "suspended";
  } else if (action === "feature") {
    listing.featuredUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  } else if (action === "verify_listing") {
    listing.verificationStatus = "verified";
    listing.verificationNote =
      "Platform listing check completed. This is not a legal title verification.";
  } else if (action === "reject_verification") {
    listing.verificationStatus = "rejected";
    listing.verificationNote = req.body.reason ?? "";
  }
  await listing.save();
  const owner = await User.findById(listing.listedBy).lean();
  if (owner) {
    await notifyUser({
      userId: String(owner._id),
      title: "Listing update",
      body: `${listing.title} is now ${listing.status} / ${listing.approvalStatus}`,
      type: "listing",
      link: "/dashboard/properties",
      email: owner.email,
    });
  }
  await writeAudit({
    actorId: req.user!.id,
    action: `admin.listing.${action}`,
    entity: "Property",
    entityId: String(listing._id),
    ip: req.ip,
  });
  res.json({ listing });
});

export const amenities = asyncHandler(async (_req: Request, res: Response) => {
  const items = await Amenity.find().lean();
  res.json({ items });
});

export const saveAmenity = asyncHandler(async (req: Request, res: Response) => {
  const item = await Amenity.findOneAndUpdate({ key: req.body.key }, req.body, { upsert: true, new: true });
  res.json({ item });
});

export const reports = asyncHandler(async (_req: Request, res: Response) => {
  const items = await Report.find().sort({ createdAt: -1 }).lean();
  res.json({ items });
});

export const patchReport = asyncHandler(async (req: Request, res: Response) => {
  const item = await Report.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await writeAudit({ actorId: req.user!.id, action: "admin.report.update", entity: "Report", entityId: req.params.id });
  res.json({ item });
});

export const payments = asyncHandler(async (_req: Request, res: Response) => {
  const items = await Payment.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json({ items });
});

export const settings = asyncHandler(async (_req: Request, res: Response) => {
  const item = await PlatformSetting.findOneAndUpdate({ key: "default" }, {}, { upsert: true, new: true });
  res.json({ settings: item });
});

export const saveSettings = asyncHandler(async (req: Request, res: Response) => {
  const item = await PlatformSetting.findOneAndUpdate({ key: "default" }, req.body, { upsert: true, new: true });
  await writeAudit({ actorId: req.user!.id, action: "admin.settings.update", entity: "PlatformSetting" });
  res.json({ settings: item });
});

export const auditLogs = asyncHandler(async (_req: Request, res: Response) => {
  const items = await AuditLog.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json({ items });
});

export const plans = asyncHandler(async (_req: Request, res: Response) => {
  const items = await SubscriptionPlan.find().lean();
  res.json({ items });
});

export const savePlan = asyncHandler(async (req: Request, res: Response) => {
  const item = await SubscriptionPlan.findOneAndUpdate({ code: req.body.code }, req.body, { upsert: true, new: true });
  res.json({ item });
});

export const agents = asyncHandler(async (_req: Request, res: Response) => {
  const items = await AgentProfile.find().populate("userId", "fullName email mobile status").lean();
  res.json({ items });
});

export const verifyAgent = asyncHandler(async (req: Request, res: Response) => {
  const item = await AgentProfile.findByIdAndUpdate(req.params.id, { verified: req.body.verified }, { new: true });
  await writeAudit({ actorId: req.user!.id, action: "admin.agent.verify", entity: "AgentProfile", entityId: req.params.id });
  res.json({ item });
});

export const agencies = asyncHandler(async (_req: Request, res: Response) => {
  const items = await Agency.find().lean();
  res.json({ items });
});
