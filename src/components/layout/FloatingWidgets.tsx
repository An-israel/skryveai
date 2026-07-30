import { useLocation } from "react-router-dom";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { SonderWidget } from "@/components/sonder/SonderWidget";

// The floating helpers (chat + Sonder) belong to the authenticated app, not to
// public marketing/registration pages. Hide them there so e.g. the Sonder popup
// never appears on an event landing page.
const HIDE_EXACT = new Set([
  "/", "/login", "/signup", "/pricing", "/about", "/contact", "/careers",
  "/blog", "/forgot-password", "/reset-password", "/verify-email",
  "/privacy-policy", "/terms", "/waitlist",
]);
const HIDE_PREFIX = ["/e/", "/blog/", "/vetting/how-it-works"];

export function FloatingWidgets() {
  const { pathname } = useLocation();
  const hidden = HIDE_EXACT.has(pathname) || HIDE_PREFIX.some((p) => pathname.startsWith(p));
  if (hidden) return null;
  return (
    <>
      <ChatWidget />
      <SonderWidget />
    </>
  );
}
