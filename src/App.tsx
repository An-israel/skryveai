import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { PageGuard } from "@/components/PageGuard";
import { PublicThemeWrapper } from "@/components/PublicThemeWrapper";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import PaymentCallback from "./pages/PaymentCallback";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import About from "./pages/About";
import Contact from "./pages/Contact";
import TeamManagement from "./pages/TeamManagement";
import Referrals from "./pages/Referrals";
import Careers from "./pages/Careers";
import CVBuilder from "./pages/CVBuilder";
import ATSChecker from "./pages/ATSChecker";
import LinkedInAnalyzer from "./pages/LinkedInAnalyzer";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import LearnHub from "./pages/LearnHub";
import LearnPath from "./pages/LearnPath";
import LearnAssignment from "./pages/LearnAssignment";
import SkillLearningAnalytics from "./pages/admin/SkillLearningAnalytics";
import { ChatWidget } from "@/components/chat/ChatWidget";

const queryClient = new QueryClient();

const GuardedRoute = ({ children }: { children: React.ReactNode }) => (
  <PageGuard>{children}</PageGuard>
);

// Public routes are forced to light mode regardless of the user's app theme
const PublicRoute = ({ children }: { children: React.ReactNode }) => (
  <PublicThemeWrapper>
    <PageGuard>{children}</PageGuard>
  </PublicThemeWrapper>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="skryve-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <ChatWidget />
        <Routes>
          {/* Public / marketing / auth — always light */}
          <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/pricing" element={<PublicRoute><Pricing /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/privacy-policy" element={<PublicRoute><PrivacyPolicy /></PublicRoute>} />
          <Route path="/terms" element={<PublicRoute><TermsOfService /></PublicRoute>} />
          <Route path="/about" element={<PublicRoute><About /></PublicRoute>} />
          <Route path="/contact" element={<PublicRoute><Contact /></PublicRoute>} />
          <Route path="/careers" element={<PublicRoute><Careers /></PublicRoute>} />
          <Route path="/blog" element={<PublicRoute><Blog /></PublicRoute>} />
          <Route path="/blog/:slug" element={<PublicRoute><BlogPost /></PublicRoute>} />

          {/* Authenticated app — respects user theme preference */}
          <Route path="/dashboard" element={<GuardedRoute><Dashboard /></GuardedRoute>} />
          <Route path="/payment/callback" element={<PaymentCallback />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/skill-learning" element={<GuardedRoute><SkillLearningAnalytics /></GuardedRoute>} />
          <Route path="/settings" element={<GuardedRoute><Settings /></GuardedRoute>} />
          <Route path="/team" element={<GuardedRoute><TeamManagement /></GuardedRoute>} />
          <Route path="/referrals" element={<GuardedRoute><Referrals /></GuardedRoute>} />
          <Route path="/cv-builder" element={<GuardedRoute><CVBuilder /></GuardedRoute>} />
          <Route path="/ats-checker" element={<GuardedRoute><ATSChecker /></GuardedRoute>} />
          <Route path="/linkedin-analyzer" element={<GuardedRoute><LinkedInAnalyzer /></GuardedRoute>} />
          <Route path="/learn" element={<GuardedRoute><LearnHub /></GuardedRoute>} />
          <Route path="/learn/:userLearningId" element={<GuardedRoute><LearnPath /></GuardedRoute>} />
          <Route path="/learn/:userLearningId/assignment/:assignmentId" element={<GuardedRoute><LearnAssignment /></GuardedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
