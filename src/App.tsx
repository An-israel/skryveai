import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { PageGuard } from "@/components/PageGuard";
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
import CampaignDetails from "./pages/CampaignDetails";
import AutoPilot from "./pages/AutoPilot";
import EmailReply from "./pages/EmailReply";

const queryClient = new QueryClient();

const GuardedRoute = ({ children }: { children: React.ReactNode }) => (
  <PageGuard>{children}</PageGuard>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="skryveai-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<GuardedRoute><Landing /></GuardedRoute>} />
          <Route path="/login" element={<GuardedRoute><Login /></GuardedRoute>} />
          <Route path="/signup" element={<GuardedRoute><Signup /></GuardedRoute>} />
          <Route path="/dashboard" element={<GuardedRoute><Dashboard /></GuardedRoute>} />
          <Route path="/campaigns/new" element={<GuardedRoute><NewCampaign /></GuardedRoute>} />
          <Route path="/pricing" element={<GuardedRoute><Pricing /></GuardedRoute>} />
          <Route path="/payment/callback" element={<PaymentCallback />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/forgot-password" element={<GuardedRoute><ForgotPassword /></GuardedRoute>} />
          <Route path="/reset-password" element={<GuardedRoute><ResetPassword /></GuardedRoute>} />
          <Route path="/settings" element={<GuardedRoute><Settings /></GuardedRoute>} />
          <Route path="/analytics" element={<GuardedRoute><Analytics /></GuardedRoute>} />
          <Route path="/privacy-policy" element={<GuardedRoute><PrivacyPolicy /></GuardedRoute>} />
          <Route path="/terms" element={<GuardedRoute><TermsOfService /></GuardedRoute>} />
          <Route path="/about" element={<GuardedRoute><About /></GuardedRoute>} />
          <Route path="/contact" element={<GuardedRoute><Contact /></GuardedRoute>} />
          <Route path="/team" element={<GuardedRoute><TeamManagement /></GuardedRoute>} />
          <Route path="/referrals" element={<GuardedRoute><Referrals /></GuardedRoute>} />
          <Route path="/careers" element={<GuardedRoute><Careers /></GuardedRoute>} />
          <Route path="/cv-builder" element={<GuardedRoute><CVBuilder /></GuardedRoute>} />
          <Route path="/ats-checker" element={<GuardedRoute><ATSChecker /></GuardedRoute>} />
          <Route path="/campaigns/:id" element={<GuardedRoute><CampaignDetails /></GuardedRoute>} />
          <Route path="/auto-pilot" element={<GuardedRoute><AutoPilot /></GuardedRoute>} />
          <Route path="/reply" element={<EmailReply />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
