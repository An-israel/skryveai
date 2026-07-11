// tiptip — Skryve's growth control center. Owner-only (see is_tiptip_owner).
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  isTiptipOwner, fetchContent, fetchKeywords, fetchMentions, fetchTasks,
  type TiptipContent, type TiptipKeyword, type TiptipMention, type TiptipTask,
} from "@/lib/tiptip/api";
import { OverviewTab } from "@/components/tiptip/OverviewTab";
import { ContentTab } from "@/components/tiptip/ContentTab";
import { KeywordsTab } from "@/components/tiptip/KeywordsTab";
import { CalendarTab } from "@/components/tiptip/CalendarTab";
import { MentionsTab } from "@/components/tiptip/MentionsTab";
import { TechSeoTab } from "@/components/tiptip/TechSeoTab";

export interface TiptipData {
  content: TiptipContent[];
  keywords: TiptipKeyword[];
  mentions: TiptipMention[];
  tasks: TiptipTask[];
}

export default function Tiptip() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [data, setData] = useState<TiptipData>({ content: [], keywords: [], mentions: [], tasks: [] });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [content, keywords, mentions, tasks] = await Promise.all([
      fetchContent(), fetchKeywords(), fetchMentions(), fetchTasks(),
    ]);
    setData({ content, keywords, mentions, tasks });
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const ok = await isTiptipOwner();
      setAllowed(ok);
      if (!ok) { navigate("/dashboard"); return; }
      void reload();
    })();
  }, [navigate, reload]);

  if (allowed === null) {
    return <div className="p-8 text-sm text-muted-foreground">Checking access…</div>;
  }
  if (!allowed) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">tiptip</h1>
          <p className="text-[13px] text-muted-foreground">Skryve growth engine — SEO · AEO · GEO. Private to you.</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="mentions">Brand Mentions</TabsTrigger>
          <TabsTrigger value="tech">Technical SEO</TabsTrigger>
        </TabsList>

        <div className="mt-5">
          <TabsContent value="overview"><OverviewTab data={data} loading={loading} /></TabsContent>
          <TabsContent value="content"><ContentTab data={data} loading={loading} reload={reload} /></TabsContent>
          <TabsContent value="calendar"><CalendarTab data={data} reload={reload} /></TabsContent>
          <TabsContent value="keywords"><KeywordsTab data={data} reload={reload} /></TabsContent>
          <TabsContent value="mentions"><MentionsTab data={data} reload={reload} /></TabsContent>
          <TabsContent value="tech"><TechSeoTab data={data} reload={reload} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
