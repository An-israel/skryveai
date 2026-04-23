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
import NewCampaign from "./pages/NewCampaign";
import Pricing from "./pages/Pricing";
import PaymentCallback from "./pages/PaymentCallback";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
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
import CampaignDetails from "./pages/CampaignDetails";
import AutoPilot from "./pages/AutoPilot";
import EmailReply from "./pages/EmailReply";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import EmailFinder from "./pages/EmailFinder";
import EmailFinderLanding from "./pages/EmailFinderLanding";
import LearnHub from "./pages/LearnHub";
import LearnPath from "./pages/LearnPath";
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
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="skryveai-theme">
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
          <Route path="/tools/email-finder" element={<PublicThemeWrapper><EmailFinderLanding /></PublicThemeWrapper>} />

          {/* Authenticated app — respects user theme preference */}
          <Route path="/dashboard" element={<GuardedRoute><Dashboard /></GuardedRoute>} />
          <Route path="/campaigns/new" element={<GuardedRoute><NewCampaign /></GuardedRoute>} />
          <Route path="/payment/callback" element={<PaymentCallback />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/settings" element={<GuardedRoute><Settings /></GuardedRoute>} />
          <Route path="/analytics" element={<GuardedRoute><Analytics /></GuardedRoute>} />
          <Route path="/team" element={<GuardedRoute><TeamManagement /></GuardedRoute>} />
          <Route path="/referrals" element={<GuardedRoute><Referrals /></GuardedRoute>} />
          <Route path="/cv-builder" element={<GuardedRoute><CVBuilder /></GuardedRoute>} />
          <Route path="/ats-checker" element={<GuardedRoute><ATSChecker /></GuardedRoute>} />
          <Route path="/linkedin-analyzer" element={<GuardedRoute><LinkedInAnalyzer /></GuardedRoute>} />
          <Route path="/campaigns/:id" element={<GuardedRoute><CampaignDetails /></GuardedRoute>} />
          <Route path="/auto-pilot" element={<GuardedRoute><AutoPilot /></GuardedRoute>} />
          <Route path="/reply" element={<EmailReply />} />
          <Route path="/email-finder" element={<GuardedRoute><EmailFinder /></GuardedRoute>} />
          <Route path="/tools/learn" element={<GuardedRoute><LearnHub /></GuardedRoute>} />
          <Route path="/tools/learn/:userLearningId" element={<GuardedRoute><LearnPath /></GuardedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
