import { prismadb } from "@/lib/prisma";

export interface WorkflowStats {
  total: number;
  connectionLevels: {
    NONE: number;
    MESSAGE_SENT: number;
    CONNECTED: number;
    IN_TOUCH: number;
    FRIENDS: number;
  };
  emailStats: {
    withEmail: number;
    withoutEmail: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
  personalizationStats: {
    withInsert: number;
    withoutInsert: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
  emailStatus: {
    BLANK: number;
    DRAFTED: number;
    SENT: number;
  };
  campaigns: Array<{
    name: string;
    count: number;
  }>;
}

export const getWorkflowStats = async (userId: string): Promise<WorkflowStats> => {
  const contacts = await prismadb.crm_Contacts.findMany({
    where: {
      assigned_to: userId,
    },
    select: {
      email: true,
      email_confidence: true,
      personalized_insert: true,
      insert_confidence: true,
      email_status: true,
      connection_level: true,
      campaign: true,
    },
  });

  const stats: WorkflowStats = {
    total: contacts.length,
    connectionLevels: {
      NONE: 0,
      MESSAGE_SENT: 0,
      CONNECTED: 0,
      IN_TOUCH: 0,
      FRIENDS: 0,
    },
    emailStats: {
      withEmail: 0,
      withoutEmail: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
    },
    personalizationStats: {
      withInsert: 0,
      withoutInsert: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
    },
    emailStatus: {
      BLANK: 0,
      DRAFTED: 0,
      SENT: 0,
    },
    campaigns: [],
  };

  const campaignCounts: Record<string, number> = {};

  for (const contact of contacts) {
    // Connection levels
    const level = contact.connection_level || "NONE";
    if (level in stats.connectionLevels) {
      stats.connectionLevels[level as keyof typeof stats.connectionLevels]++;
    } else {
      stats.connectionLevels.NONE++;
    }

    // Email stats
    if (contact.email) {
      stats.emailStats.withEmail++;
      const confidence = contact.email_confidence;
      if (confidence === "HIGH") stats.emailStats.highConfidence++;
      else if (confidence === "MEDIUM") stats.emailStats.mediumConfidence++;
      else if (confidence === "LOW") stats.emailStats.lowConfidence++;
    } else {
      stats.emailStats.withoutEmail++;
    }

    // Personalization stats
    if (contact.personalized_insert) {
      stats.personalizationStats.withInsert++;
      const confidence = contact.insert_confidence;
      if (confidence === "HIGH") stats.personalizationStats.highConfidence++;
      else if (confidence === "MEDIUM") stats.personalizationStats.mediumConfidence++;
      else if (confidence === "LOW") stats.personalizationStats.lowConfidence++;
    } else {
      stats.personalizationStats.withoutInsert++;
    }

    // Email status
    const status = contact.email_status || "BLANK";
    if (status in stats.emailStatus) {
      stats.emailStatus[status as keyof typeof stats.emailStatus]++;
    } else {
      stats.emailStatus.BLANK++;
    }

    // Campaigns
    const campaign = contact.campaign || "Uncategorized";
    campaignCounts[campaign] = (campaignCounts[campaign] || 0) + 1;
  }

  // Convert campaign counts to array and sort by count
  stats.campaigns = Object.entries(campaignCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return stats;
};
