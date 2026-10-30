import { Router } from "express";
import { optionalAuth, requireAuth, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { memoryUpload } from "../middleware/upload.js";
import {
  changePasswordSchema,
  forgotSchema,
  loginSchema,
  registerSchema,
  resetSchema,
  verifySchema,
} from "../validators/auth.js";
import * as auth from "../controllers/authController.js";
import * as props from "../controllers/propertyController.js";
import * as engage from "../controllers/engagementController.js";
import * as admin from "../controllers/adminController.js";
import * as pay from "../controllers/paymentController.js";
import * as users from "../controllers/userController.js";
import { Amenity } from "../models/Amenity.js";
import { dbState } from "../config/db.js";
import { env } from "../config/env.js";

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, db: dbState(), env: env.nodeEnv, upiSandbox: env.upi.sandbox });
});

router.post("/auth/register", validate(registerSchema), auth.register);
router.post("/auth/login", validate(loginSchema), auth.login);
router.post("/auth/logout", auth.logout);
router.post("/auth/refresh", auth.refresh);
router.get("/auth/me", requireAuth, auth.me);
router.post("/auth/forgot-password", validate(forgotSchema), auth.forgot);
router.post("/auth/reset-password", validate(resetSchema), auth.reset);
router.post("/auth/verify-email", validate(verifySchema), auth.verify);
router.patch("/auth/change-password", requireAuth, validate(changePasswordSchema), auth.changePass);

router.get("/properties", optionalAuth, props.searchPublic);
router.get("/properties/featured", props.featured);
router.get("/properties/suggestions", props.suggestions);
router.get("/properties/home", props.homeSections);
router.get("/properties/:slug", optionalAuth, props.publicDetail);

router.get("/amenities", async (_req, res) => {
  const items = await Amenity.find({ active: true }).lean();
  res.json({ items });
});

router.get("/agents", users.publicAgents);
router.get("/agents/:id", users.publicAgent);

router.post("/listings", requireAuth, requireRoles("owner", "agent", "admin"), props.create);
router.get("/listings/mine", requireAuth, requireRoles("owner", "agent", "admin"), props.mine);
router.get("/listings/:id", requireAuth, props.getMine);
router.patch("/listings/:id", requireAuth, props.patch);
router.delete("/listings/:id", requireAuth, props.remove);
router.post("/listings/:id/submit", requireAuth, props.submit);
router.post("/listings/:id/status", requireAuth, props.availability);
router.post("/listings/:id/images", requireAuth, memoryUpload.array("images", 12), props.uploadImages);
router.delete("/listings/:id/images/:imageId", requireAuth, props.deleteImage);
router.patch("/listings/:id/images/order", requireAuth, props.reorderImages);

router.post("/favorites/:id", requireAuth, props.toggleFavorite);
router.get("/favorites", requireAuth, props.myFavorites);

router.get("/views/recent", requireAuth, engage.recentlyViewed);
router.delete("/views/recent", requireAuth, engage.clearViews);

router.post("/inquiries", optionalAuth, engage.createInquiry);
router.get("/inquiries", requireAuth, engage.listInquiries);
router.patch("/inquiries/:id", requireAuth, engage.respondInquiry);

router.post("/appointments", requireAuth, engage.createAppointment);
router.get("/appointments", requireAuth, engage.listAppointments);
router.patch("/appointments/:id", requireAuth, engage.updateAppointment);

router.post("/reports", requireAuth, engage.createReport);
router.post("/reviews", requireAuth, engage.createReview);

router.post("/conversations", requireAuth, engage.startConversation);
router.get("/conversations", requireAuth, engage.listConversations);
router.get("/conversations/:id/messages", requireAuth, engage.listMessages);
router.post("/conversations/:id/messages", requireAuth, engage.sendMessage);

router.get("/notifications", requireAuth, engage.listNotifications);
router.post("/notifications/:id/read", requireAuth, engage.markNotification);
router.post("/notifications/read-all", requireAuth, engage.markAllNotifications);

router.get("/dashboard/overview", requireAuth, users.dashboardOverview);
router.patch("/users/me", requireAuth, users.updateProfile);
router.post("/users/me/avatar", requireAuth, memoryUpload.single("avatar"), users.uploadAvatar);

router.get("/plans", pay.publicPlans);
router.get("/subscriptions/mine", requireAuth, pay.mySubscriptions);
router.post("/payments/orders", requireAuth, requireRoles("owner", "agent", "admin"), pay.createPayment);
router.get("/payments/mine", requireAuth, pay.myPayments);
router.get("/payments/:id", requireAuth, pay.getPayment);
router.post("/payments/webhook", pay.webhook);
router.post("/payments/sandbox/confirm", requireAuth, pay.sandbox);

router.get("/admin/analytics", requireAuth, requireRoles("admin"), admin.analytics);
router.get("/admin/users", requireAuth, requireRoles("admin"), admin.users);
router.patch("/admin/users/:id", requireAuth, requireRoles("admin"), admin.patchUser);
router.get("/admin/properties", requireAuth, requireRoles("admin"), admin.listings);
router.post("/admin/properties/:id/moderate", requireAuth, requireRoles("admin"), admin.moderateListing);
router.get("/admin/amenities", requireAuth, requireRoles("admin"), admin.amenities);
router.post("/admin/amenities", requireAuth, requireRoles("admin"), admin.saveAmenity);
router.get("/admin/reports", requireAuth, requireRoles("admin"), admin.reports);
router.patch("/admin/reports/:id", requireAuth, requireRoles("admin"), admin.patchReport);
router.get("/admin/payments", requireAuth, requireRoles("admin"), admin.payments);
router.get("/admin/settings", requireAuth, requireRoles("admin"), admin.settings);
router.patch("/admin/settings", requireAuth, requireRoles("admin"), admin.saveSettings);
router.get("/admin/audit-logs", requireAuth, requireRoles("admin"), admin.auditLogs);
router.get("/admin/plans", requireAuth, requireRoles("admin"), admin.plans);
router.post("/admin/plans", requireAuth, requireRoles("admin"), admin.savePlan);
router.get("/admin/agents", requireAuth, requireRoles("admin"), admin.agents);
router.patch("/admin/agents/:id", requireAuth, requireRoles("admin"), admin.verifyAgent);
router.get("/admin/agencies", requireAuth, requireRoles("admin"), admin.agencies);
