import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Briefcase, 
  FileText, 
  Link as LinkIcon, 
  Loader2, 
  Save, 
  Upload,
  X,
  ArrowLeft,
  Settings as SettingsIcon,
  Mail,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/Header";
import { EmailVerificationStatus } from "@/components/settings/EmailVerificationStatus";
import { SMTPConnection } from "@/components/settings/SMTPConnection";
import { useQuery } from "@tanstack/react-query";

const EXPERTISE_OPTIONS = [
  // Development
  "Web Development", "Mobile App Development", "Frontend Development", "Backend Development",
  "Full Stack Development", "Custom Software", "WordPress", "Shopify", "Webflow",
  "No-Code Development", "API Development", "DevOps",
  // Design
  "UI/UX Design", "Graphic Design", "Logo Design", "Brand Identity", "Web Design",
  "Product Design", "Motion Graphics", "3D Design", "Illustration",
  // Marketing
  "SEO", "Social Media Marketing", "Email Marketing", "Content Marketing",
  "PPC Advertising", "Influencer Marketing", "Affiliate Marketing", "Growth Hacking",
  // Content
  "Content Writing", "Copywriting", "Technical Writing", "Blog Writing",
  "Ghostwriting", "Scriptwriting", "Translation", "Proofreading",
  // Media
  "Video Production", "Video Editing", "Photography", "Podcast Production", "Animation", "Voice Over",
  // Business
  "Virtual Assistant", "Project Management", "Business Consulting", "Data Entry",
  "Customer Support", "Sales", "Lead Generation", "Market Research",
  // Tech
  "Data Science", "Machine Learning", "Cybersecurity", "Cloud Services", "Blockchain", "AI Development",
  // E-commerce
  "E-commerce", "Dropshipping", "Amazon FBA", "Product Listing",
];

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  bio: string | null;
  expertise: string[];
  portfolio_url: string | null;
  cv_url: string | null;
}

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCV, setUploadingCV] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [calendlyUrl, setCalendlyUrl] = useState("");

  // Check if user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["super_admin", "content_editor", "support_agent"]);
      return (data && data.length > 0) || false;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) {
      fetchProfile();
    }
  }, [user, authLoading, navigate]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setCountry(data.country || "");
        setBio(data.bio || "");
        setExpertise(data.expertise || []);
        setPortfolioUrl(data.portfolio_url || "");
        setCvUrl(data.cv_url);
      }

      // Fetch user settings for calendly
      const { data: settings } = await supabase
        .from("user_settings")
        .select("calendly_url")
        .eq("user_id", user!.id)
        .single();

      if (settings) {
        setCalendlyUrl(settings.calendly_url || "");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpertise = (skill: string) => {
    setExpertise((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a PDF or Word document", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB", variant: "destructive" });
      return;
    }

    setUploadingCV(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user!.id}/cv-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("cv-uploads")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("cv-uploads").getPublicUrl(fileName);

      setCvUrl(publicUrl);
      toast({ title: "CV uploaded", description: "Your CV has been uploaded successfully" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to upload CV";
      toast({ title: "Upload failed", description: message, variant: "destructive" });
    } finally {
      setUploadingCV(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const profileData = {
        user_id: user.id,
        email: user.email!,
        full_name: fullName,
        phone: phone || null,
        country: country || null,
        bio: bio || null,
        expertise: expertise,
        portfolio_url: portfolioUrl || null,
        cv_url: cvUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(profileData, { onConflict: "user_id" });
      if (error) throw error;

      // Also update user_settings with calendly_url
      await supabase.from("user_settings").upsert({
        user_id: user.id,
        calendly_url: calendlyUrl || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      toast({ title: "Settings saved", description: "Your profile has been updated successfully" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save settings";
      toast({ title: "Save failed", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <SettingsIcon className="w-8 h-8" />
                Settings
              </h1>
              <p className="text-muted-foreground">Manage your profile and preferences</p>
            </div>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'}`}>
              <TabsTrigger value="profile" className="gap-2">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="expertise" className="gap-2">
                <Briefcase className="w-4 h-4" />
                Expertise
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <FileText className="w-4 h-4" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-2">
                <Mail className="w-4 h-4" />
                Email
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="email-admin" className="gap-2">
                  <Mail className="w-4 h-4" />
                  Admin
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your personal details and contact information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Nigeria" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell potential clients about yourself..." rows={4} />
                    <p className="text-xs text-muted-foreground">This will be used to personalize your outreach pitches</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expertise">
              <Card>
                <CardHeader>
                  <CardTitle>Your Expertise</CardTitle>
                  <CardDescription>Select the services you offer to clients</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {EXPERTISE_OPTIONS.map((skill) => (
                      <Badge
                        key={skill}
                        variant={expertise.includes(skill) ? "default" : "outline"}
                        className="cursor-pointer transition-colors"
                        onClick={() => toggleExpertise(skill)}
                      >
                        {skill}
                        {expertise.includes(skill) && <X className="w-3 h-3 ml-1" />}
                      </Badge>
                    ))}
                  </div>
                  {expertise.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {expertise.length} service{expertise.length !== 1 ? "s" : ""} selected
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio & CV</CardTitle>
                  <CardDescription>Add your portfolio link and upload your CV</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="portfolio" className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      Portfolio URL
                    </Label>
                    <Input id="portfolio" type="url" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://yourportfolio.com" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="calendly" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Calendly URL (Optional)
                    </Label>
                    <Input id="calendly" type="url" value={calendlyUrl} onChange={(e) => setCalendlyUrl(e.target.value)} placeholder="https://calendly.com/yourusername" />
                    <p className="text-xs text-muted-foreground">Add your Calendly link to include meeting scheduling in your pitches</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      CV / Resume
                    </Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleCVUpload} className="hidden" />
                      {cvUrl ? (
                        <div className="space-y-2">
                          <FileText className="w-12 h-12 mx-auto text-primary" />
                          <p className="text-sm font-medium">CV uploaded</p>
                          <div className="flex justify-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => window.open(cvUrl, "_blank")}>
                              View CV
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingCV}>
                              {uploadingCV ? <Loader2 className="w-4 h-4 animate-spin" /> : "Replace"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">PDF or Word document, max 5MB</p>
                          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingCV}>
                            {uploadingCV ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload CV
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email">
              <SMTPConnection />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="email-admin">
                <EmailVerificationStatus />
              </TabsContent>
            )}
          </Tabs>

          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
