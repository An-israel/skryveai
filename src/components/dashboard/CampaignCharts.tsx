import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface CampaignChartData {
  name: string;
  sent: number;
  opened: number;
  replies: number;
}

interface PerformanceData {
  date: string;
  sent: number;
  opened: number;
  replies: number;
}

interface CampaignChartsProps {
  campaignData: CampaignChartData[];
  performanceData: PerformanceData[];
  totalStats: {
    sent: number;
    opened: number;
    replied: number;
    bounced: number;
  };
}

const COLORS = {
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  destructive: "hsl(var(--destructive))",
  info: "hsl(var(--info))",
  muted: "hsl(var(--muted-foreground))",
};

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

export function CampaignCharts({ campaignData, performanceData, totalStats }: CampaignChartsProps) {
  const pieData = [
    { name: "Opened", value: totalStats.opened, color: PIE_COLORS[0] },
    { name: "Sent (not opened)", value: Math.max(0, totalStats.sent - totalStats.opened - totalStats.bounced), color: PIE_COLORS[1] },
    { name: "Replied", value: totalStats.replied, color: PIE_COLORS[2] },
    { name: "Bounced", value: totalStats.bounced, color: PIE_COLORS[3] },
  ].filter(d => d.value > 0);

  const chartConfig = {
    sent: {
      label: "Sent",
      color: "hsl(var(--info))",
    },
    opened: {
      label: "Opened",
      color: "hsl(var(--success))",
    },
    replies: {
      label: "Replies",
      color: "hsl(var(--warning))",
    },
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Performance Over Time */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Performance Over Time</CardTitle>
          <CardDescription>Email metrics over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          {performanceData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.info} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.info} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area 
                  type="monotone" 
                  dataKey="sent" 
                  stroke={COLORS.info} 
                  fillOpacity={1} 
                  fill="url(#colorSent)" 
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="opened" 
                  stroke={COLORS.success} 
                  fillOpacity={1} 
                  fill="url(#colorOpened)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              No data yet - start sending emails to see trends
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Status</CardTitle>
          <CardDescription>Distribution of email outcomes</CardDescription>
        </CardHeader>
        <CardContent>
          {pieData.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border rounded-lg shadow-lg px-3 py-2">
                            <p className="text-sm font-medium">{payload[0].name}</p>
                            <p className="text-sm text-muted-foreground">{payload[0].value} emails</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {pieData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: entry.color }} 
                    />
                    <span className="text-muted-foreground">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              No emails sent yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Comparison */}
      {campaignData.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Campaign Comparison</CardTitle>
            <CardDescription>Performance across your campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={campaignData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tickLine={false} 
                  axisLine={false} 
                  className="text-xs fill-muted-foreground"
                  width={100}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="sent" fill={COLORS.info} radius={[0, 4, 4, 0]} />
                <Bar dataKey="opened" fill={COLORS.success} radius={[0, 4, 4, 0]} />
                <Bar dataKey="replies" fill={COLORS.warning} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
