import { supabase } from "@/integrations/supabase/client";

export type EmailCategory =
  | "jobs"
  | "apps"
  | "messages"
  | "offers"
  | "projects"
  | "events"
  | "learning"
  | "marketing";

export interface NotifyParams {
  /** Recipient's auth user id. */
  userId: string;
  /** Short machine type, e.g. "offer", "message", "application_update". */
  type: string;
  title: string;
  message: string;
  /** In-app route to open when the notification is clicked, e.g. "/applications". */
  link?: string;
  /** Which email preference gates the email copy (omit to only create the in-app notification). */
  emailCategory?: EmailCategory;
}

/**
 * Create an in-app notification for a user and email them when their
 * preference for that category allows it. Fire-and-forget: failures are logged
 * but never block the calling flow.
 */
export async function notifyUser(params: NotifyParams): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("send-notification", { body: params });
    if (error) console.error("notifyUser failed:", error.message);
  } catch (e) {
    console.error("notifyUser failed:", e);
  }
}
