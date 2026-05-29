import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { PublicThemeWrapper } from "@/components/PublicThemeWrapper";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChatWidget } from "@/components/chat/ChatWidget";

// ── Public pages ────────────────────────────────────────────
import Landing          from "./pages/Landing";
import Login            from "./pages/Login";
import Signup           from "./pages/Signup";
import Pricing          from "./pages/Pricing";
import About            from "./pages/About";
import Contact          from "./pages/Contact";
import Careers          from "./pages/Careers";
import Blog             from "./pages/Blog";
import BlogPost         from "./pages/BlogPost";
import ForgotPassword   from "./pages/ForgotPassword";
import ResetPassword    from "./pages/ResetPassword";
import VerifyEmail      from "./pages/VerifyEmail";
import PrivacyPolicy    from "./pages/PrivacyPolicy";
import TermsOfService   from "./pages/TermsOfService";
import NotFound         from "./pages/NotFound";

// ── Onboarding pages ────────────────────────────────────────
import OnboardingDispatcher from "./pages/onboarding/OnboardingDispatcher";
import TalentOnboarding    from "./pages/onboarding/TalentOnboarding";
import ClientOnboarding    from "./pages/onboarding/ClientOnboarding";

// ── Authenticated pages ─────────────────────────────────────
import Dashboard        from "./pages/Dashboard";
import Profile          from "./pages/Profile";
import ProfileView      from "./pages/ProfileView";
import Jobs             from "./pages/Jobs";
import Marketplace      from "./pages/Marketplace";
import MarketplaceJob   from "./pages/MarketplaceJob";
import Applications     from "./pages/Applications";
import Projects         from "./pages/Projects";
import Events           from "./pages/Events";
import EventDetail      from "./pages/EventDetail";
import LearnHub         from "./pages/LearnHub";
import LearnPath        from "./pages/LearnPath";
import LearnAssignment  from "./pages/LearnAssignment";
import CVBuilder        from "./pages/CVBuilder";
import ATSChecker       from "./pages/ATSChecker";
import LinkedInAnalyzer from "./pages/LinkedInAnalyzer";
import Messages         from "./pages/Messages";
import MessageThread    from "./pages/MessageThread";
import Notifications    from "./pages/Notifications";
import Settings         from "./pages/Settings";
import Billing          from "./pages/Billing";
import TeamManagement   from "./pages/TeamManagement";
import Referrals        from "./pages/Referrals";
import Admin            from "./pages/Admin";
import SkillLearningAnalytics from "./pages/admin/SkillLearningAnalytics";
import PaymentCallback  from "./pages/PaymentCallback";

const queryClient = new QueryClient();

// Public routes are forced to light mode
const Public = ({ children }: { children: React.ReactNode }) => (
  <PublicThemeWrapper>{children}</PublicThemeWrapper>
);

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="skryve-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ChatWidget />
            <Routes>

              {/* ── Public / marketing / auth ── */}
              <Route path="/"                element={<Public><Landing /></Public>} />
              <Route path="/login"           element={<Public><Login /></Public>} />
              <Route path="/signup"          element={<Public><Signup /></Public>} />
              <Route path="/pricing"         element={<Public><Pricing /></Public>} />
              <Route path="/about"           element={<Public><About /></Public>} />
              <Route path="/contact"         element={<Public><Contact /></Public>} />
              <Route path="/careers"         element={<Public><Careers /></Public>} />
              <Route path="/blog"            element={<Public><Blog /></Public>} />
              <Route path="/blog/:slug"      element={<Public><BlogPost /></Public>} />
              <Route path="/forgot-password" element={<Public><ForgotPassword /></Public>} />
              <Route path="/reset-password"  element={<Public><ResetPassword /></Public>} />
              <Route path="/verify-email"   element={<Public><VerifyEmail /></Public>} />
              <Route path="/privacy-policy"  element={<Public><PrivacyPolicy /></Public>} />
              <Route path="/terms"           element={<Public><TermsOfService /></Public>} />

              {/* ── Authenticated app — sidebar + topbar layout ── */}
              <Route element={<AppLayout />}>

                {/* Core */}
                <Route path="/dashboard"    element={<Dashboard />} />
                <Route path="/profile"      element={<Profile />} />
                <Route path="/profile/:username" element={<ProfileView />} />

                {/* Jobs & Marketplace */}
                <Route path="/jobs"                 element={<Jobs />} />
                <Route path="/marketplace"          element={<Marketplace />} />
                <Route path="/marketplace/:jobId"   element={<MarketplaceJob />} />
                <Route path="/applications"         element={<Applications />} />
                <Route path="/projects"             element={<Projects />} />

                {/* Events */}
                <Route path="/events"               element={<Events />} />
                <Route path="/events/:eventId"      element={<EventDetail />} />

                {/* Learning */}
                <Route path="/learn"                             element={<LearnHub />} />
                <Route path="/learn/:courseId"                   element={<LearnPath />} />
                <Route path="/learn/:courseId/:lessonId"         element={<LearnAssignment />} />

                {/* Tools */}
                <Route path="/cv-builder"           element={<CVBuilder />} />
                <Route path="/ats-checker"          element={<ATSChecker />} />
                <Route path="/linkedin-analyzer"    element={<LinkedInAnalyzer />} />

                {/* Messaging & Notifications */}
                <Route path="/messages"                      element={<Messages />} />
                <Route path="/messages/:conversationId"      element={<MessageThread />} />
                <Route path="/notifications"                 element={<Notifications />} />

                {/* Account */}
                <Route path="/settings"   element={<Settings />} />
                <Route path="/billing"    element={<Billing />} />
                <Route path="/referrals"  element={<Referrals />} />
                <Route path="/team"       element={<TeamManagement />} />

                {/* Admin */}
                <Route path="/admin"               element={<Admin />} />
                <Route path="/admin/skill-learning" element={<SkillLearningAnalytics />} />
              </Route>

              {/* ── Onboarding — no sidebar layout ── */}
              <Route path="/onboarding"         element={<OnboardingDispatcher />} />
              <Route path="/onboarding/talent"  element={<TalentOnboarding />} />
              <Route path="/onboarding/client"  element={<ClientOnboarding />} />

              {/* ── No layout ── */}
              <Route path="/payment/callback" element={<PaymentCallback />} />

              {/* ── 404 ── */}
              <Route path="*" element={<NotFound />} />

            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
