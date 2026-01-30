import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import type { ConnectionLevel } from "@prisma/client";

// --- GET handler: list contacts with filter, sort, pagination ---

const connectionStageEnum = z.enum([
  "DRAFTED",
  "MESSAGE_SENT",
  "DIDNT_CONNECT",
  "CONNECTED",
  "IN_TOUCH",
]);

const sortFieldMap: Record<string, string> = {
  name: "last_name",
  company: "company",
  email_status: "email_status",
  connection_stage: "connection_stage",
  createdAt: "created_on",
};

const getQuerySchema = z.object({
  stage: connectionStageEnum.optional(),
  campaignId: z.string().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
});

function buildWhereClause(
  userId: string,
  params: z.infer<typeof getQuerySchema>
) {
  const where: Record<string, unknown> = { assigned_to: userId };

  if (params.stage) {
    where.connection_stage = params.stage;
  }
  if (params.campaignId) {
    where.campaignId = params.campaignId;
  }
  if (params.search) {
    where.OR = [
      { first_name: { contains: params.search, mode: "insensitive" } },
      { last_name: { contains: params.search, mode: "insensitive" } },
      { company: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildOrderBy(sort?: string, order?: "asc" | "desc") {
  const field = sort ? sortFieldMap[sort] : undefined;
  const direction = order ?? "desc";
  return { [field ?? "created_on"]: direction };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  try {
    const userId = session.user.id;
    const url = new URL(req.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());
    const parsed = getQuerySchema.safeParse(rawParams);

    const params = parsed.success ? parsed.data : {};
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 50, 200);

    const where = buildWhereClause(userId, params);
    const orderBy = buildOrderBy(params.sort, params.order);

    const [contacts, total] = await Promise.all([
      prismadb.crm_Contacts.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prismadb.crm_Contacts.count({ where }),
    ]);

    return NextResponse.json({
      contacts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return new NextResponse("Failed to fetch contacts", { status: 500 });
  }
}

// Validation schema for connection level enum
const connectionLevelEnum = z.enum([
  "NONE",
  "MESSAGE_SENT",
  "CONNECTED",
  "IN_TOUCH",
  "FRIENDS",
]);

// Validation helper - returns proper Prisma enum type
function validateConnectionLevel(value: string | undefined | null): ConnectionLevel | undefined {
  if (!value) return undefined;
  const result = connectionLevelEnum.safeParse(value);
  return result.success ? result.data as ConnectionLevel : undefined;
}

//Create route
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }
  try {
    const body = await req.json();
    const userId = session.user.id;

    if (!body) {
      return new NextResponse("No form data", { status: 400 });
    }

    const {
      assigned_to,
      assigned_account,
      birthday_day,
      birthday_month,
      birthday_year,
      description,
      email,
      personal_email,
      first_name,
      last_name,
      office_phone,
      mobile_phone,
      website,
      status,
      social_twitter,
      social_facebook,
      social_linkedin,
      social_skype,
      social_instagram,
      social_youtube,
      social_tiktok,
      type,
      // Student Networking CRM - Workflow Fields
      company,
      campaign,
      connection_level,
    } = body;

    // Validate connection_level enum
    const validatedConnectionLevel = validateConnectionLevel(connection_level);

    const newContact = await prismadb.crm_Contacts.create({
      data: {
        v: 0,
        createdBy: userId,
        updatedBy: userId,
        ...(assigned_account !== null && assigned_account !== undefined
          ? {
              assigned_accounts: {
                connect: {
                  id: assigned_account,
                },
              },
            }
          : {}),
        assigned_to_user: {
          connect: {
            id: assigned_to,
          },
        },
        birthday: birthday_day + "/" + birthday_month + "/" + birthday_year,
        description,
        email,
        personal_email,
        first_name,
        last_name,
        office_phone,
        mobile_phone,
        website,
        status,
        social_twitter,
        social_facebook,
        social_linkedin,
        social_skype,
        social_instagram,
        social_youtube,
        social_tiktok,
        type,
        // Student Networking CRM - Workflow Fields
        company,
        campaign,
        connection_level: validatedConnectionLevel,
      },
    });

    return NextResponse.json({ newContact }, { status: 200 });
  } catch (error) {
    console.log("[NEW_CONTACT_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

//Update route
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }
  try {
    const body = await req.json();
    const userId = session.user.id;

    if (!body) {
      return new NextResponse("No form data", { status: 400 });
    }

    const {
      id,
      assigned_account,
      assigned_to,
      birthday_day,
      birthday_month,
      birthday_year,
      description,
      email,
      personal_email,
      first_name,
      last_name,
      office_phone,
      mobile_phone,
      website,
      status,
      social_twitter,
      social_facebook,
      social_linkedin,
      social_skype,
      social_instagram,
      social_youtube,
      social_tiktok,
      type,
      // Student Networking CRM - Workflow Fields
      company,
      campaign,
      connection_level,
    } = body;

    // Validate connection_level enum
    const validatedConnectionLevel = validateConnectionLevel(connection_level);

    // Verify user has access to this contact before updating
    const existingContact = await prismadb.crm_Contacts.findFirst({
      where: {
        id,
        assigned_to: userId,
      },
    });

    if (!existingContact) {
      return NextResponse.json(
        { error: "Contact not found or access denied" },
        { status: 403 }
      );
    }

    const newContact = await prismadb.crm_Contacts.update({
      where: {
        id,
      },
      data: {
        v: 0,
        updatedBy: userId,
        //Update assigned_accountsIDs only if assigned_account is not empty
        ...(assigned_account !== null && assigned_account !== undefined
          ? {
              assigned_accounts: {
                connect: {
                  id: assigned_account,
                },
              },
            }
          : {}),
        assigned_to_user: {
          connect: {
            id: assigned_to,
          },
        },
        birthday: birthday_day + "/" + birthday_month + "/" + birthday_year,
        description,
        email,
        personal_email,
        first_name,
        last_name,
        office_phone,
        mobile_phone,
        website,
        status,
        social_twitter,
        social_facebook,
        social_linkedin,
        social_skype,
        social_instagram,
        social_youtube,
        social_tiktok,
        type,
        // Student Networking CRM - Workflow Fields
        company,
        campaign,
        connection_level: validatedConnectionLevel,
      },
    });

    /*     if (assigned_to !== userId) {
      const notifyRecipient = await prismadb.users.findFirst({
        where: {
          id: assigned_to,
        },
      });

      if (!notifyRecipient) {
        return new NextResponse("No user found", { status: 400 });
      }

      await sendEmail({
        from: process.env.EMAIL_FROM as string,
        to: notifyRecipient.email || "info@softbase.cz",
        subject:
          notifyRecipient.userLanguage === "en"
            ? `New contact ${first_name} ${last_name} has been added to the system and assigned to you.`
            : `Nový kontakt ${first_name} ${last_name} byla přidána do systému a přidělena vám.`,
        text:
          notifyRecipient.userLanguage === "en"
            ? `New contact ${first_name} ${last_name} has been added to the system and assigned to you. You can click here for detail: ${process.env.NEXT_PUBLIC_APP_URL}/crm/contacts/${newContact.id}`
            : `Nový kontakt ${first_name} ${last_name} byla přidán do systému a přidělena vám. Detaily naleznete zde: ${process.env.NEXT_PUBLIC_APP_URL}/crm/contact/${newContact.id}`,
      });
    } */

    return NextResponse.json({ newContact }, { status: 200 });
  } catch (error) {
    console.log("UPDATE_CONTACT_PUT]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
