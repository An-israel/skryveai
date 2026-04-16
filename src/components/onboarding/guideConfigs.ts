import {
  Search, Globe, Mail, Send, Eye, CheckCircle2, BarChart3,
  FileText, Upload, Sparkles, Download, Target, AlertTriangle,
  Linkedin, Zap, Settings, Users, Bot, Clock, TrendingUp, 
  Briefcase, Gift, Shield, Calendar
} from "lucide-react";
import type { GuideStep } from "./FeatureGuide";
import React from "react";

export const dashboardGuide: GuideStep[] = [
  {
    title: "Welcome to Your Dashboard",
    description: "This is your command center. You can see your campaign stats, credits, subscription status, and quick-access career tools all in one place.",
    icon: React.createElement(BarChart3, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Create a New Campaign",
    description: "Click 'New Campaign' to start finding clients. You'll search for businesses, our AI analyzes their websites, and generates personalized pitch emails for you.",
    icon: React.createElement(Send, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Career Tools",
    description: "Use CV Builder, ATS Checker, and LinkedIn Analyzer to strengthen your professional profile before outreach. A strong profile = better pitches.",
    icon: React.createElement(FileText, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Connect Your Email First",
    description: "Go to Settings to connect your Gmail or SMTP email. This lets SkryveAI send pitches directly from YOUR inbox for better deliverability.",
    icon: React.createElement(Mail, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Track Your Results",
    description: "Check Analytics for detailed open rates, reply rates, and campaign performance over time. Use this data to improve your outreach strategy.",
    icon: React.createElement(TrendingUp, { className: "w-6 h-6 text-primary" }),
  },
];

export const newCampaignGuide: GuideStep[] = [
  {
    title: "Choose Your Campaign Type",
    description: "Pick 'Find Clients' to search for businesses, 'Direct Client' to pitch a specific company, 'Investors' for fundraising, or 'Job Application' to apply for jobs.",
    icon: React.createElement(Briefcase, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Search for Businesses",
    description: "Enter a business type (e.g., 'restaurants', 'law firms') and location (e.g., 'Lagos, Nigeria'). We'll find real businesses with their contact details.",
    icon: React.createElement(Search, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Select Your Targets",
    description: "Review the list and select businesses you want to pitch. Businesses with emails and websites get the best results.",
    icon: React.createElement(CheckCircle2, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "AI Website Analysis",
    description: "Our AI visits each business's website to find pain points and opportunities. This info powers your personalized pitch — so better websites = better pitches.",
    icon: React.createElement(Globe, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Review & Send Pitches",
    description: "AI generates a unique email for each business. You can edit any pitch before sending. Click 'Approve All' to approve them, then send!",
    icon: React.createElement(Mail, { className: "w-6 h-6 text-primary" }),
  },
];

export const cvBuilderGuide: GuideStep[] = [
  {
    title: "Two Ways to Build Your CV",
    description: "Choose 'Build from Scratch' to enter your details step by step, or 'Upload & Optimize' to upload an existing CV and let AI enhance it.",
    icon: React.createElement(FileText, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Fill in Your Details",
    description: "Enter your name, contact info, professional summary, work experience, education, and skills. Be specific — the more detail, the better the result.",
    icon: React.createElement(Sparkles, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "AI Enhancement",
    description: "Once you submit, our AI restructures your CV with powerful action verbs, quantified achievements, and ATS-friendly formatting.",
    icon: React.createElement(Zap, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Download Your CV",
    description: "Download your polished CV as a PDF or Word document. It's formatted professionally and ready to use for applications or outreach.",
    icon: React.createElement(Download, { className: "w-6 h-6 text-primary" }),
  },
];

export const atsCheckerGuide: GuideStep[] = [
  {
    title: "What is ATS?",
    description: "ATS (Applicant Tracking Systems) are software that companies use to filter CVs. If your CV isn't ATS-friendly, it may never be seen by a human recruiter.",
    icon: React.createElement(Target, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Upload or Paste Your CV",
    description: "Upload a PDF of your CV or paste the text directly. Optionally add a job description to see how well your CV matches that specific role.",
    icon: React.createElement(Upload, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Get Your Score",
    description: "AI scores your CV across 8 categories: formatting, keywords, experience, education, skills, achievements, readability, and ATS compatibility.",
    icon: React.createElement(BarChart3, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Improve Your CV",
    description: "Review the specific suggestions and missing keywords. Fix these issues to increase your score and land more interviews.",
    icon: React.createElement(TrendingUp, { className: "w-6 h-6 text-primary" }),
  },
];

export const linkedInGuide: GuideStep[] = [
  {
    title: "Analyze Your LinkedIn Profile",
    description: "Upload a PDF export of your LinkedIn profile (or paste the text) and our AI will score it across multiple dimensions.",
    icon: React.createElement(Linkedin, { className: "w-6 h-6 text-[#0A66C2]" }),
  },
  {
    title: "How to Export LinkedIn PDF",
    description: "Go to your LinkedIn profile → click 'More' → 'Save to PDF'. Then upload that PDF here for the most accurate analysis.",
    icon: React.createElement(Download, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Get Actionable Tips",
    description: "See your overall score, strengths, and exactly what to fix — headline, summary, experience bullets, skills, and more. Each tip is actionable.",
    icon: React.createElement(Sparkles, { className: "w-6 h-6 text-primary" }),
  },
];

export const autoPilotGuide: GuideStep[] = [
  {
    title: "What is AutoPilot?",
    description: "AutoPilot automatically finds businesses, analyzes their websites, generates pitches, and sends emails — all on autopilot while you focus on your work.",
    icon: React.createElement(Bot, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Set Your Targets",
    description: "Configure what type of businesses you want to reach, their locations, and your daily email quota. AutoPilot will handle the rest.",
    icon: React.createElement(Target, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Connect Email First",
    description: "AutoPilot sends from YOUR mailbox (Gmail or SMTP). Make sure you've connected an email in Settings before launching.",
    icon: React.createElement(Mail, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Monitor Activity",
    description: "Track every email sent, opened, and replied to in the Activity Log. Pause or stop anytime if you want to adjust your strategy.",
    icon: React.createElement(Eye, { className: "w-6 h-6 text-primary" }),
  },
];

export const settingsGuide: GuideStep[] = [
  {
    title: "Complete Your Profile",
    description: "Add your bio, expertise, and portfolio URL. This information is used by AI to generate better, more personalized pitches for your campaigns.",
    icon: React.createElement(Settings, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Connect Your Email",
    description: "Connect Gmail (easiest) or SMTP to send pitches from your own email. This improves deliverability and looks more professional to clients.",
    icon: React.createElement(Mail, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Upload Your CV",
    description: "Upload your CV/resume so AI can reference your skills and experience when crafting pitches. This makes emails much more relevant.",
    icon: React.createElement(FileText, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Set Sending Preferences",
    description: "Configure your sender name, daily send limits, and email signature. Set up email warmup to gradually build your sender reputation.",
    icon: React.createElement(Clock, { className: "w-6 h-6 text-primary" }),
  },
];

export const analyticsGuide: GuideStep[] = [
  {
    title: "Your Campaign Analytics",
    description: "See how your outreach is performing at a glance — total emails sent, open rates, and reply rates across all your campaigns.",
    icon: React.createElement(BarChart3, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Campaign Breakdown",
    description: "Compare performance across campaigns to see which industries, locations, or pitch styles get the best results.",
    icon: React.createElement(TrendingUp, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "Use Data to Improve",
    description: "Low open rates? Try better subject lines. Low replies? Refine your pitch. Analytics helps you iterate and get more clients over time.",
    icon: React.createElement(Sparkles, { className: "w-6 h-6 text-primary" }),
  },
];

export const referralsGuide: GuideStep[] = [
  {
    title: "Earn With Referrals",
    description: "Share your unique referral link with friends. When they subscribe, you earn 40% commission on their payment — paid directly to you.",
    icon: React.createElement(Gift, { className: "w-6 h-6 text-primary" }),
  },
  {
    title: "How It Works",
    description: "Copy your referral link → share it → when someone signs up and subscribes using your link, your commission is tracked automatically.",
    icon: React.createElement(Send, { className: "w-6 h-6 text-primary" }),
  },
];
