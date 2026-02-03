import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, User, Loader2, Phone, Globe, FileText, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const EXPERTISE_OPTIONS = [
  "Web Development",
  "Mobile Development",
  "UI/UX Design",
  "Graphic Design",
  "SEO",
  "Content Writing",
  "Digital Marketing",
  "Social Media Management",
  "Video Editing",
  "Photography",
  "Data Analysis",
  "Cloud Services",
];

export default function Signup() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    portfolioUrl: "",
    bio: "",
    expertise: [] as string[],
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleExpertiseToggle = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      expertise: prev.expertise.includes(skill)
        ? prev.expertise.filter(s => s !== skill)
        : [...prev.expertise, skill],
    }));
  };

  const handleCvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "CV must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setCvFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1) {
      if (!formData.fullName || !formData.email || !formData.password) {
        toast({
          title: "Missing fields",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (formData.expertise.length === 0) {
        toast({
          title: "Select expertise",
          description: "Please select at least one area of expertise",
          variant: "destructive",
        });
        return;
      }
      setStep(3);
      return;
    }

    setIsLoading(true);

    try {
      // Sign up with Supabase Auth
      // The database trigger handle_new_user() automatically creates:
      // - profile, subscription, and user_settings records
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone || null,
            portfolio_url: formData.portfolioUrl || null,
            bio: formData.bio || null,
            expertise: formData.expertise,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Upload CV if provided (after signup since we need the user ID)
        if (cvFile) {
          const filePath = `${authData.user.id}/${Date.now()}_${cvFile.name}`;
          const { error: uploadError } = await supabase.storage
            .from("cv-uploads")
            .upload(filePath, cvFile);
          
          if (uploadError) {
            console.error("CV upload error:", uploadError);
          } else {
            // Update profile with CV URL after the trigger has created it
            await supabase.from("profiles")
              .update({ 
                cv_url: filePath,
                phone: formData.phone || null,
                portfolio_url: formData.portfolioUrl || null,
                bio: formData.bio || null,
                expertise: formData.expertise,
              })
              .eq("user_id", authData.user.id);
          }
        } else {
          // Update profile with additional data not handled by trigger
          await supabase.from("profiles")
            .update({ 
              phone: formData.phone || null,
              portfolio_url: formData.portfolioUrl || null,
              bio: formData.bio || null,
              expertise: formData.expertise,
            })
            .eq("user_id", authData.user.id);
        }

        // Update user settings with service description
        await supabase.from("user_settings")
          .update({ service_description: formData.expertise.join(", ") })
          .eq("user_id", authData.user.id);

        toast({
          title: "Account created successfully!",
          description: "Please check your email to verify your account before signing in.",
        });
        navigate("/login");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast({
        title: "Sign up failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-subtle">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="font-bold text-3xl text-gradient">SkryveAI</span>
        </Link>

        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-2 w-16 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {step === 1 && "Create Your Account"}
              {step === 2 && "Your Expertise"}
              {step === 3 && "Portfolio & CV"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Start landing more clients with AI-powered outreach"}
              {step === 2 && "Tell us what services you offer"}
              {step === 3 && "Help us personalize your pitches"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={formData.fullName}
                        onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+234 800 000 0000"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-10"
                        minLength={6}
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                  </div>
                </>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <Label>Select your areas of expertise *</Label>
                  <div className="flex flex-wrap gap-2">
                    {EXPERTISE_OPTIONS.map(skill => (
                      <Badge
                        key={skill}
                        variant={formData.expertise.includes(skill) ? "default" : "outline"}
                        className="cursor-pointer transition-colors"
                        onClick={() => handleExpertiseToggle(skill)}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selected: {formData.expertise.length} / {EXPERTISE_OPTIONS.length}
                  </p>
                </div>
              )}

              {step === 3 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="portfolioUrl">Portfolio URL</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="portfolioUrl"
                        type="url"
                        placeholder="https://yourportfolio.com"
                        value={formData.portfolioUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, portfolioUrl: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cv">Upload CV/Resume</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer">
                      <input
                        id="cv"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleCvUpload}
                        className="hidden"
                      />
                      <label htmlFor="cv" className="cursor-pointer">
                        {cvFile ? (
                          <div className="flex items-center justify-center gap-2 text-primary">
                            <FileText className="w-5 h-5" />
                            <span>{cvFile.name}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Upload className="w-8 h-8" />
                            <span>Click to upload (PDF, DOC, max 5MB)</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Brief Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell potential clients about yourself and your experience..."
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                )}
                <Button type="submit" className="flex-1" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Creating account...
                    </>
                  ) : step < 3 ? (
                    "Continue"
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </div>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
