import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function OnboardingDispatcher() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      const u = session.user;
      setUser(u);

      const [{ data: tp }, { data: cp }] = await Promise.all([
        (supabase as any).from('talent_profiles').select('id,onboarding_completed').eq('user_id', u.id).maybeSingle(),
        (supabase as any).from('client_profiles').select('id,onboarding_completed').eq('user_id', u.id).maybeSingle(),
      ]);

      if (tp) {
        if (tp.onboarding_completed) {
          navigate('/dashboard');
        } else {
          navigate('/onboarding/talent');
        }
        return;
      }

      if (cp) {
        if (cp.onboarding_completed) {
          navigate('/dashboard');
        } else {
          navigate('/onboarding/client');
        }
        return;
      }

      const role = u.user_metadata?.role;
      if (role === 'talent') {
        navigate('/onboarding/talent');
        return;
      }
      if (role === 'client') {
        navigate('/onboarding/client');
        return;
      }

      setLoading(false);
    })();
  }, [navigate]);

  const selectRole = async (role: 'talent' | 'client') => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase.auth.updateUser({ data: { role } });
      navigate(role === 'talent' ? '/onboarding/talent' : '/onboarding/client');
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-2 mb-10">
        <img src="/logo.png" alt="Skryve" className="h-10 w-10 object-contain" />
        <span className="font-bold text-gray-900 text-2xl">Skryve</span>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">How will you use Skryve?</h1>
      <p className="text-gray-500 mb-10 text-center">Choose your path to get started</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg">
        <button
          onClick={() => selectRole('talent')}
          className="border-2 border-gray-200 hover:border-[#2563EB] rounded-2xl p-8 flex flex-col items-center gap-4 transition-all group focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        >
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <Briefcase className="w-8 h-8 text-[#2563EB]" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900 text-lg">I'm looking for work</p>
            <p className="text-sm text-gray-500 mt-1">Create a talent profile and find opportunities</p>
          </div>
        </button>
        <button
          onClick={() => selectRole('client')}
          className="border-2 border-gray-200 hover:border-[#2563EB] rounded-2xl p-8 flex flex-col items-center gap-4 transition-all group focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        >
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center group-hover:bg-purple-100 transition-colors">
            <Users className="w-8 h-8 text-purple-600" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900 text-lg">I'm hiring talent</p>
            <p className="text-sm text-gray-500 mt-1">Post jobs and find skilled professionals</p>
          </div>
        </button>
      </div>
    </div>
  );
}
