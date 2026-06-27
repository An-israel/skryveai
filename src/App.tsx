import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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
import JobPreferences   from "./pages/JobPreferences";
import SavedJobs        from "./pages/SavedJobs";
import JobDetail        from "./pages/JobDetail";
import Marketplace      from "./pages/Marketplace";
import MarketplaceJob   from "./pages/MarketplaceJob";
import Applications     from "./pages/Applications";
import Projects         from "./pages/Projects";
import ProjectDetail    from "./pages/ProjectDetail";
import Events           from "./pages/Events";
import EventDetail      from "./pages/EventDetail";
import LearnHub         from "./pages/LearnHub";
import LearnPath        from "./pages/LearnPath";
import LearnAssignment  from "./pages/LearnAssignment";
import MyLearning       from "./pages/MyLearning";
import QuizPage         from "./pages/QuizPage";
import CourseComplete   from "./pages/CourseComplete";
import CertificatePage  from "./pages/CertificatePage";
import CertificateVerify from "./pages/CertificateVerify";
import CVBuilder        from "./pages/CVBuilder";
import CVEditor         from "./pages/CVEditor";
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
import PortfolioManager from "./pages/PortfolioManager";
import PostJob          from "./pages/PostJob";
import MyJobPosts       from "./pages/MyJobPosts";
import BrowseTalent     from "./pages/BrowseTalent";
import PaymentRelease   from "./pages/PaymentRelease";
import PostEvent        from "./pages/PostEvent";
import MyEvents         from "./pages/MyEvents";

const queryClient = new QueryClient();

// Public routes respect the user's chosen theme (light / dark / system)
const Public = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export default function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="skryve-theme">
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
                <Route path="/dashboard"          element={<Dashboard />} />
                <Route path="/profile"            element={<Profile />} />
                <Route path="/profile/edit"       element={<Profile />} />
                <Route path="/profile/portfolio"  element={<PortfolioManager />} />
                <Route path="/profile/:username"  element={<ProfileView />} />

                {/* Jobs & Marketplace */}
                <Route path="/jobs"                 element={<Jobs />} />
                <Route path="/jobs/preferences"     element={<JobPreferences />} />
                <Route path="/jobs/saved"           element={<SavedJobs />} />
                <Route path="/jobs/:jobId"          element={<JobDetail />} />
                <Route path="/marketplace"              element={<Marketplace />} />
                <Route path="/marketplace/post"         element={<PostJob />} />
                <Route path="/marketplace/my-jobs"      element={<MyJobPosts />} />
                <Route path="/marketplace/:jobId"       element={<MarketplaceJob />} />
                <Route path="/talent"               element={<BrowseTalent />} />
                <Route path="/applications"         element={<Applications />} />
                <Route path="/projects"             element={<Projects />} />
                <Route path="/projects/:projectId"  element={<ProjectDetail />} />
                <Route path="/projects/:projectId/pay" element={<PaymentRelease />} />

                {/* Events */}
                <Route path="/events"               element={<Events />} />
                <Route path="/events/post"          element={<PostEvent />} />
                <Route path="/events/my-events"     element={<MyEvents />} />
                <Route path="/events/:eventId"      element={<EventDetail />} />

                {/* Learning */}
                <Route path="/learn"                             element={<LearnHub />} />
                <Route path="/learn/my-courses"                  element={<MyLearning />} />
                <Route path="/learn/:courseId"                   element={<LearnPath />} />
                <Route path="/learn/:courseId/:lessonId"         element={<LearnAssignment />} />
                <Route path="/learn/:courseId/quiz/:quizId"      element={<QuizPage />} />
                <Route path="/learn/:courseId/complete"          element={<CourseComplete />} />
                <Route path="/learn/:courseId/certificate"       element={<CertificatePage />} />

                {/* Tools */}
                <Route path="/cv-builder"           element={<CVBuilder />} />
                <Route path="/cv-builder/new"       element={<CVEditor />} />
                <Route path="/cv-builder/:cvId"     element={<CVEditor />} />
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
              <Route path="/certificates/:certId" element={<CertificateVerify />} />

              {/* ── 404 ── */}
              <Route path="*" element={<NotFound />} />

            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}
