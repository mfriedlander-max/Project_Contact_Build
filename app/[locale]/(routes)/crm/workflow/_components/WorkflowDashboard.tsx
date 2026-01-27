"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { WorkflowStats } from "@/actions/crm/get-workflow-stats";
import {
  Users,
  Mail,
  Sparkles,
  Send,
  UserCheck,
  MessageSquare,
  Link2,
  Heart,
  Target,
} from "lucide-react";

interface WorkflowDashboardProps {
  stats: WorkflowStats;
}

const connectionLevelConfig = {
  NONE: { label: "None", color: "bg-gray-100 text-gray-600", icon: Users },
  MESSAGE_SENT: { label: "Message Sent", color: "bg-blue-100 text-blue-800", icon: MessageSquare },
  CONNECTED: { label: "Connected", color: "bg-purple-100 text-purple-800", icon: Link2 },
  IN_TOUCH: { label: "In Touch", color: "bg-indigo-100 text-indigo-800", icon: UserCheck },
  FRIENDS: { label: "Friends", color: "bg-green-100 text-green-800", icon: Heart },
};

const emailStatusConfig = {
  BLANK: { label: "Not Started", color: "bg-gray-100 text-gray-600" },
  DRAFTED: { label: "Drafted", color: "bg-blue-100 text-blue-800" },
  SENT: { label: "Sent", color: "bg-green-100 text-green-800" },
};

export function WorkflowDashboard({ stats }: WorkflowDashboardProps) {
  const emailCoverage = stats.total > 0
    ? Math.round((stats.emailStats.withEmail / stats.total) * 100)
    : 0;

  const insertCoverage = stats.total > 0
    ? Math.round((stats.personalizationStats.withInsert / stats.total) * 100)
    : 0;

  const sentRate = stats.total > 0
    ? Math.round((stats.emailStatus.SENT / stats.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              In your networking pipeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Coverage</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailCoverage}%</div>
            <Progress value={emailCoverage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.emailStats.withEmail} of {stats.total} have emails
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personalized</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insertCoverage}%</div>
            <Progress value={insertCoverage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.personalizationStats.withInsert} have personalized inserts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentRate}%</div>
            <Progress value={sentRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.emailStatus.SENT} emails sent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connection Levels & Email Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Connection Levels</CardTitle>
            <CardDescription>Track your relationship progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(Object.keys(connectionLevelConfig) as Array<keyof typeof connectionLevelConfig>).map((level) => {
                const config = connectionLevelConfig[level];
                const count = stats.connectionLevels[level];
                const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                const Icon = config.icon;

                return (
                  <div key={level} className="flex items-center">
                    <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{config.label}</span>
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Outreach Status</CardTitle>
            <CardDescription>Pipeline progress for email campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(Object.keys(emailStatusConfig) as Array<keyof typeof emailStatusConfig>).map((status) => {
                const config = emailStatusConfig[status];
                const count = stats.emailStatus[status];
                const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;

                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={config.color}>{config.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{count}</span>
                      <span className="text-sm text-muted-foreground">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Email Confidence</h4>
              <div className="flex gap-2">
                <Badge className="bg-green-100 text-green-800">
                  High: {stats.emailStats.highConfidence}
                </Badge>
                <Badge className="bg-yellow-100 text-yellow-800">
                  Medium: {stats.emailStats.mediumConfidence}
                </Badge>
                <Badge className="bg-red-100 text-red-800">
                  Low: {stats.emailStats.lowConfidence}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Campaigns
          </CardTitle>
          <CardDescription>Contact distribution by campaign</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaigns yet. Add campaigns to your contacts to track them here.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {stats.campaigns.map((campaign) => {
                const percentage = stats.total > 0
                  ? Math.round((campaign.count / stats.total) * 100)
                  : 0;

                return (
                  <div
                    key={campaign.name}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <span className="text-sm font-medium truncate max-w-[150px]">
                      {campaign.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{campaign.count}</span>
                      <span className="text-xs text-muted-foreground">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
