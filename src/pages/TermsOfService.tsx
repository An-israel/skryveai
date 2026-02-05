import { Header } from "@/components/layout/Header";
import { Link } from "react-router-dom";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-24 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 5, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using SkryveAI ("Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground">
              SkryveAI is an AI-powered cold outreach platform that helps freelancers and businesses 
              find potential clients, analyze websites, and send personalized outreach emails. 
              Our Service includes business discovery, website analysis, email generation, and email delivery features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground mb-2">When you create an account, you agree to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="text-muted-foreground mb-2">You agree not to use our Service to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Send spam or unsolicited bulk emails</li>
              <li>Harass, abuse, or harm others</li>
              <li>Violate any applicable laws or regulations (including anti-spam laws like CAN-SPAM, GDPR)</li>
              <li>Infringe on intellectual property rights</li>
              <li>Transmit malware or malicious content</li>
              <li>Misrepresent your identity or affiliation</li>
              <li>Collect data without proper consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Email Sending Responsibilities</h2>
            <p className="text-muted-foreground">
              You are solely responsible for the content of emails sent through our Service. 
              You must comply with all applicable email marketing laws, including providing accurate sender information, 
              honoring opt-out requests, and ensuring your emails are truthful and not misleading.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Gmail Integration</h2>
            <p className="text-muted-foreground">
              When you connect your Gmail account, you authorize SkryveAI to send emails on your behalf. 
              You remain responsible for all emails sent through your connected Gmail account. 
              Our use of Gmail API is governed by Google's Terms of Service and our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Subscription and Payments</h2>
            <p className="text-muted-foreground mb-2">
              Paid features require a subscription. By subscribing, you agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Pay all applicable fees</li>
              <li>Automatic renewal unless cancelled before the renewal date</li>
              <li>No refunds for partial subscription periods</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
            <p className="text-muted-foreground">
              SkryveAI and its original content, features, and functionality are owned by SkryveAI and are 
              protected by international copyright, trademark, and other intellectual property laws. 
              You retain ownership of content you create using our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              SkryveAI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, 
              including loss of profits, data, or business opportunities. Our total liability is limited to the 
              amount you paid us in the past 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground">
              The Service is provided "as is" without warranties of any kind, either express or implied. 
              We do not guarantee that the Service will be uninterrupted, secure, or error-free. 
              We do not guarantee specific results from using our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account at any time for violations of these Terms. 
              You may cancel your account at any time. Upon termination, your right to use the Service 
              will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms at any time. We will notify users of significant changes 
              via email or through our Service. Continued use after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with applicable laws, 
              without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about these Terms of Service, please contact us at{" "}
              <a href="mailto:aniekaneazy@gmail.com" className="text-primary hover:underline">
                aniekaneazy@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t">
          <Link to="/" className="text-primary hover:underline">
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
