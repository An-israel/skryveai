export interface AutoPilotConfig {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  expertise: {
    industry: string;
    services: string[];
    valueProp: string;
  };
  target_businesses: {
    types: string[];
    sizeRange: string;
    mustHaveWebsite: boolean;
    mustHaveInstagram: boolean;
  };
  locations: Array<{
    country: string;
    cities: string[];
  }>;
  daily_quota: {
    emailsPerDay: number;
    sendingSchedule: {
      startHour: number;
      endHour: number;
      spreadThroughoutDay: boolean;
    };
  };
  email_style: {
    tone: string;
    length: string;
    ctaType: string;
  };
  compliance: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
