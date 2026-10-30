import type { Request, Response } from "express";
import { Inquiry } from "../models/Inquiry.js";
import { Appointment } from "../models/Appointment.js";
import { Property } from "../models/Property.js";
import { PropertyView } from "../models/PropertyView.js";
import { Report } from "../models/Report.js";
import { Review } from "../models/Review.js";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";
import { notifyUser } from "../services/notify.js";
import { getIo } from "../realtime/io.js";

export const createInquiry = asyncHandler(async (req: Request, res: Response) => {
  const property = await Property.findById(req.body.propertyId);
  if (!property || property.status !== "published" || property.approvalStatus !== "approved") {
    throw notFound("Property is not available");
  }
  const recent = await Inquiry.findOne({
    propertyId: property._id,
    email: req.body.email,
    createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
  });
  if (recent) throw badRequest("Please wait a few minutes before sending another inquiry");
  const inquiry = await Inquiry.create({
    propertyId: property._id,
    fromUserId: req.user?.id,
    toUserId: property.listedBy,
    name: req.body.name,
    email: req.body.email,
    mobile: req.body.mobile,
    message: req.body.message,
    preferredContact: req.body.preferredContact ?? "phone",
    preferredVisitDate: req.body.preferredVisitDate,
  });
  await Property.findByIdAndUpdate(property._id, { $inc: { inquiryCount: 1 } });
  const owner = await User.findById(property.listedBy).lean();
  if (owner) {
    await notifyUser({
      userId: String(owner._id),
      title: "New property inquiry",
      body: `${req.body.name} inquired about ${property.title}`,
      type: "inquiry",
      link: "/dashboard/inquiries",
      email: owner.email,
    });
  }
  res.status(201).json({ inquiry });
});

export const listInquiries = asyncHandler(async (req: Request, res: Response) => {
  const role = req.user!.role;
  const filter =
    role === "admin"
      ? {}
      : role === "owner" || role === "agent"
        ? { toUserId: req.user!.id }
        : { fromUserId: req.user!.id };
  const items = await Inquiry.find(filter).populate("propertyId", "title slug").sort({ createdAt: -1 }).lean();
  res.json({ items });
});

export const respondInquiry = asyncHandler(async (req: Request, res: Response) => {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) throw notFound();
  if (String(inquiry.toUserId) !== req.user!.id && req.user!.role !== "admin") throw forbidden();
  inquiry.response = req.body.response;
  inquiry.status = req.body.status ?? "contacted";
  await inquiry.save();
  res.json({ inquiry });
});

export const createAppointment = asyncHandler(async (req: Request, res: Response) => {
  const property = await Property.findById(req.body.propertyId);
  if (!property || property.status !== "published" || property.approvalStatus !== "approved") {
    throw badRequest("This listing is not bookable");
  }
  const scheduledAt = new Date(req.body.scheduledAt);
  const overlap = await Appointment.findOne({
    propertyId: property._id,
    status: "confirmed",
    scheduledAt,
  });
  if (overlap) throw badRequest("This time slot is already confirmed");
  const appt = await Appointment.create({
    propertyId: property._id,
    requesterId: req.user!.id,
    hostId: property.listedBy,
    scheduledAt,
    message: req.body.message ?? "",
  });
  const host = await User.findById(property.listedBy).lean();
  if (host) {
    await notifyUser({
      userId: String(host._id),
      title: "Visit request",
      body: `A visit was requested for ${property.title}`,
      type: "appointment",
      link: "/dashboard/appointments",
      email: host.email,
    });
  }
  res.status(201).json({ appointment: appt });
});

export const listAppointments = asyncHandler(async (req: Request, res: Response) => {
  const filter =
    req.user!.role === "admin"
      ? {}
      : { $or: [{ requesterId: req.user!.id }, { hostId: req.user!.id }] };
  const items = await Appointment.find(filter)
    .populate("propertyId", "title slug")
    .sort({ scheduledAt: 1 })
    .lean();
  res.json({ items });
});

export const updateAppointment = asyncHandler(async (req: Request, res: Response) => {
  const appt = await Appointment.findById(req.params.id);
  if (!appt) throw notFound();
  const isHost = String(appt.hostId) === req.user!.id || req.user!.role === "admin";
  const isGuest = String(appt.requesterId) === req.user!.id;
  const status = req.body.status as string;
  if (["confirmed", "rejected"].includes(status) && !isHost) throw forbidden();
  if (status === "cancelled" && !isHost && !isGuest) throw forbidden();
  if (status === "confirmed") {
    const clash = await Appointment.findOne({
      _id: { $ne: appt._id },
      propertyId: appt.propertyId,
      status: "confirmed",
      scheduledAt: appt.scheduledAt,
    });
    if (clash) throw badRequest("Overlapping confirmed appointment");
  }
  if (req.body.scheduledAt) {
    appt.scheduledAt = new Date(req.body.scheduledAt);
    appt.status = "rescheduled";
  } else {
    appt.status = status;
  }
  if (req.body.alternativeTime) appt.alternativeTime = new Date(req.body.alternativeTime);
  await appt.save();
  const other = isHost ? appt.requesterId : appt.hostId;
  await notifyUser({
    userId: String(other),
    title: "Appointment update",
    body: `Visit status is now ${appt.status}`,
    type: "appointment",
    link: "/dashboard/appointments",
  });
  res.json({ appointment: appt });
});

export const recentlyViewed = asyncHandler(async (req: Request, res: Response) => {
  const views = await PropertyView.find({ userId: req.user!.id })
    .sort({ viewedAt: -1 })
    .limit(20)
    .populate("propertyId")
    .lean();
  res.json({ items: views });
});

export const clearViews = asyncHandler(async (req: Request, res: Response) => {
  await PropertyView.deleteMany({ userId: req.user!.id });
  res.json({ ok: true });
});

export const createReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await Report.create({
    reporterId: req.user!.id,
    propertyId: req.body.propertyId,
    targetUserId: req.body.targetUserId,
    reason: req.body.reason,
    details: req.body.details ?? "",
  });
  res.status(201).json({ report });
});

export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await Review.create({
    authorId: req.user!.id,
    propertyId: req.body.propertyId,
    agentId: req.body.agentId,
    rating: req.body.rating,
    comment: req.body.comment ?? "",
  });
  res.status(201).json({ review });
});

export const startConversation = asyncHandler(async (req: Request, res: Response) => {
  const property = await Property.findById(req.body.propertyId);
  if (!property) throw notFound();
  const participants = [req.user!.id, String(property.listedBy)].sort();
  let convo = await Conversation.findOne({
    propertyId: property._id,
    participants: { $all: participants },
  });
  if (!convo) convo = await Conversation.create({ propertyId: property._id, participants });
  res.json({ conversation: convo });
});

export const listConversations = asyncHandler(async (req: Request, res: Response) => {
  const items = await Conversation.find({ participants: req.user!.id })
    .populate("propertyId", "title slug")
    .sort({ lastMessageAt: -1 })
    .lean();
  res.json({ items });
});

export const listMessages = asyncHandler(async (req: Request, res: Response) => {
  const convo = await Conversation.findById(req.params.id);
  if (!convo) throw notFound();
  if (!convo.participants.map(String).includes(req.user!.id)) throw forbidden();
  const items = await Message.find({ conversationId: convo._id }).sort({ createdAt: 1 }).lean();
  await Message.updateMany(
    { conversationId: convo._id, senderId: { $ne: req.user!.id } },
    { $addToSet: { readBy: req.user!.id } },
  );
  res.json({ items });
});

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const convo = await Conversation.findById(req.params.id);
  if (!convo) throw notFound();
  if (!convo.participants.map(String).includes(req.user!.id)) throw forbidden();
  const msg = await Message.create({
    conversationId: convo._id,
    senderId: req.user!.id,
    body: req.body.body,
    readBy: [req.user!.id],
  });
  convo.lastMessageAt = new Date();
  convo.lastMessagePreview = req.body.body.slice(0, 140);
  await convo.save();
  getIo()?.to(`conv:${String(convo._id)}`).emit("message", msg);
  const other = convo.participants.map(String).find((id) => id !== req.user!.id);
  if (other) {
    await notifyUser({
      userId: other,
      title: "New message",
      body: req.body.body.slice(0, 80),
      type: "message",
      link: "/dashboard/messages",
    });
  }
  res.status(201).json({ message: msg });
});

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const items = await Notification.find({ userId: req.user!.id }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ items });
});

export const markNotification = asyncHandler(async (req: Request, res: Response) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user!.id }, { read: true });
  res.json({ ok: true });
});

export const markAllNotifications = asyncHandler(async (req: Request, res: Response) => {
  await Notification.updateMany({ userId: req.user!.id }, { read: true });
  res.json({ ok: true });
});
