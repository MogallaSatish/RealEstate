import { Notification } from "../models/Notification.js";
import { sendMail } from "../integrations/mailer.js";
import { getIo } from "../realtime/io.js";

export async function notifyUser(opts: {
  userId: string;
  title: string;
  body: string;
  type: string;
  link?: string;
  email?: string;
}) {
  const doc = await Notification.create({
    userId: opts.userId,
    title: opts.title,
    body: opts.body,
    type: opts.type,
    link: opts.link ?? "",
  });
  getIo()?.to(`user:${opts.userId}`).emit("notification", {
    id: doc._id,
    title: opts.title,
    body: opts.body,
    type: opts.type,
    link: opts.link,
  });
  if (opts.email) {
    await sendMail(opts.email, opts.title, `<p>${opts.body}</p>`);
  }
  return doc;
}
