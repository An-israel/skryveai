import { lazy, Suspense } from "react";
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
const Landing          = lazy(() => import("./pages/Landing"));
const Login            = lazy(() => import("./pages/Login"));
const Signup           = lazy(() => import("./pages/Signup"));
const Pricing          = lazy(() => import("./pages/Pricing"));
const About            = lazy(() => import("./pages/About"));
const Contact          = lazy(() => import("./pages/Contact"));
const Careers          = lazy(() => import("./pages/Careers"));
const Blog             = lazy(() => import("./pages/Blog"));
const BlogPost         = lazy(() => import("./pages/BlogPost"));
const ForgotPassword   = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword    = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail      = lazy(() => import("./pages/VerifyEmail"));
const PrivacyPolicy    = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService   = lazy(() => import("./pages/TermsOfService"));
const NotFound         = lazy(() => import("./pages/NotFound"));

// ── Onboarding pages ────────────────────────────────────────
const OnboardingDispatcher = lazy(() => import("./pages/onboarding/OnboardingDispatcher"));
const TalentOnboarding     = lazy(() => import("./pages/onboarding/TalentOnboarding"));
const ClientOnboarding     = lazy(() => import("./pages/onboarding/ClientOnboarding"));

// ── Authenticated pages ─────────────────────────────────────
const Dashboard        = lazy(() => import("./pages/Dashboard"));
const Profile          = lazy(() => import("./pages/Profile"));
const ProfileView      = lazy(() => import("./pages/ProfileView"));
const Jobs             = lazy(() => import("./pages/Jobs"));
const JobPreferences   = lazy(() => import("./pages/JobPreferences"));
const SavedJobs        = lazy(() => import("./pages/SavedJobs"));
const JobDetail        = lazy(() => import("./pages/JobDetail"));
const Marketplace      = lazy(() => import("./pages/Marketplace"));
const MarketplaceJob   = lazy(() => import("./pages/MarketplaceJob"));
const Applications     = lazy(() => import("./pages/Applications"));
const Projects         = lazy(() => import("./pages/Projects"));
const ProjectDetail    = lazy(() => import("./pages/ProjectDetail"));
const Events           = lazy(() => import("./pages/Events"));
const EventDetail      = lazy(() => import("./pages/EventDetail"));
const LearnHub         = lazy(() => import("./pages/LearnHub"));
const LearnPath        = lazy(() => import("./pages/LearnPath"));
const LearnAssignment  = lazy(() => import("./pages/LearnAssignment"));
const MyLearning       = lazy(() => import("./pages/MyLearning"));
const QuizPage         = lazy(() => import("./pages/QuizPage"));
const CourseComplete   = lazy(() => import("./pages/CourseComplete"));
const CertificatePage  = lazy(() => import("./pages/CertificatePage"));
const CertificateVerify = lazy(() => import("./pages/CertificateVerify"));
const CVBuilder        = lazy(() => import("./pages/CVBuilder"));
const CVEditor         = lazy(() => import("./pages/CVEditor"));
const ATSChecker       = lazy(() => import("./pages/ATSChecker"));
const LinkedInAnalyzer = lazy(() => import("./pages/LinkedInAnalyzer"));
const Messages         = lazy(() => import("./pages/Messages"));
const MessageThread    = lazy(() => import("./pages/MessageThread"));
const Notifications    = lazy(() => import("./pages/Notifications"));
const Settings         = lazy(() => import("./pages/Settings"));
const Billing          = lazy(() => import("./pages/Billing"));
const TeamManagement   = lazy(() => import("./pages/TeamManagement"));
const Referrals        = lazy(() => import("./pages/Referrals"));
const Admin            = lazy(() => import("./pages/Admin"));
const SkillLearningAnalytics = lazy(() => import("./pages/admin/SkillLearningAnalytics"));
const PaymentCallback  = lazy(() => import("./pages/PaymentCallback"));
const PortfolioManager = lazy(() => import("./pages/PortfolioManager"));
const PostJob          = lazy(() => import("./pages/PostJob"));
const MyJobPosts       = lazy(() => import("./pages/MyJobPosts"));
const BrowseTalent     = lazy(() => import("./pages/BrowseTalent"));
const PaymentRelease   = lazy(() => import("./pages/PaymentRelease"));
const PostEvent        = lazy(() => import("./pages/PostEvent"));
const MyEvents         = lazy(() => import("./pages/MyEvents"));

const queryClient = new QueryClient();

// Public routes are forced to light mode
const Public = ({ children }: { children: React.ReactNode }) => (
  <PublicThemeWrapper>{children}</PublicThemeWrapper>
);

const PageSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
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
            <Suspense fallback={<PageSpinner />}>
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
                <Route path="/verify-email"    element={<Public><VerifyEmail /></Public>} />
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
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
