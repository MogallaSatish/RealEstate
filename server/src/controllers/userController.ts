import type { Request, Response } from "express";
import { User } from "../models/User.js";
import { UserProfile } from "../models/UserProfile.js";
import { AgentProfile } from "../models/AgentProfile.js";
import { Property } from "../models/Property.js";
import { Inquiry } from "../models/Inquiry.js";
import { Appointment } from "../models/Appointment.js";
import { Favorite } from "../models/Favorite.js";
import { Payment } from "../models/Payment.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadBuffer } from "../integrations/cloudinary.js";
import { notFound } from "../utils/errors.js";

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByIdAndUpdate(
    req.user!.id,
    { fullName: req.body.fullName, mobile: req.body.mobile },
    { new: true },
  );
  const profile = await UserProfile.findOneAndUpdate({ userId: req.user!.id }, req.body.profile ?? {}, {
    new: true,
    upsert: true,
  });
  if (req.user!.role === "agent") {
    await AgentProfile.findOneAndUpdate({ userId: req.user!.id }, req.body.agent ?? {}, { upsert: true });
  }
  res.json({ user, profile });
});

export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: { message: "No file" } });
  const uploaded = await uploadBuffer(file.buffer, "estatehub/avatars");
  const user = await User.findByIdAndUpdate(
    req.user!.id,
    { avatarUrl: uploaded.url, avatarPublicId: uploaded.publicId },
    { new: true },
  );
  res.json({ user });
});

export const publicAgents = asyncHandler(async (_req: Request, res: Response) => {
  const items = await AgentProfile.find()
    .populate("userId", "fullName avatarUrl email")
    .sort({ verified: -1, ratingAverage: -1 })
    .lean();
  res.json({ items });
});

export const publicAgent = asyncHandler(async (req: Request, res: Response) => {
  const profile = await AgentProfile.findOne({ userId: req.params.id }).populate("userId").lean();
  if (!profile) throw notFound();
  const listings = await Property.find({
    listedBy: req.params.id,
    status: "published",
    approvalStatus: "approved",
  }).lean();
  res.json({ profile, listings });
});

export const dashboardOverview = asyncHandler(async (req: Request, res: Response) => {
  const id = req.user!.id;
  const role = req.user!.role;
  if (role === "owner" || role === "agent" || role === "admin") {
    const [total, pending, published, inquiries, appointments, views] = await Promise.all([
      Property.countDocuments(role === "admin" ? {} : { listedBy: id }),
      Property.countDocuments({ listedBy: id, approvalStatus: "pending" }),
      Property.countDocuments({ listedBy: id, status: "published" }),
      Inquiry.countDocuments({ toUserId: id }),
      Appointment.countDocuments({ hostId: id }),
      Property.aggregate([
        { $match: role === "admin" ? {} : { listedBy: new (await import("mongoose")).default.Types.ObjectId(id) } },
        { $group: { _id: null, views: { $sum: "$viewCount" }, leads: { $sum: "$inquiryCount" } } },
      ]),
    ]);
    const payments = await Payment.countDocuments({ userId: id });
    res.json({
      role,
      metrics: {
        totalListings: total,
        pendingApprovals: pending,
        activeListings: published,
        inquiries,
        appointments,
        views: views[0]?.views ?? 0,
        leads: views[0]?.leads ?? 0,
        payments,
      },
    });
    return;
  }
  const [favorites, inquiries, appointments] = await Promise.all([
    Favorite.countDocuments({ userId: id }),
    Inquiry.countDocuments({ fromUserId: id }),
    Appointment.countDocuments({ requesterId: id }),
  ]);
  res.json({ role, metrics: { favorites, inquiries, appointments } });
});
