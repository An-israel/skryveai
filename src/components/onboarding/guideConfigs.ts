import {
  BarChart3, FileText, Upload, Sparkles, Download, Target,
  Linkedin, Zap, TrendingUp, Gift, Send,
} from "lucide-react";
import type { GuideStep } from "./FeatureGuide";
import React from "react";

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
    description: "Download your polished CV as a PDF or Word document — professionally formatted and ready for job applications.",
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
