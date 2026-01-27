import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prismadb } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, props: { params: Promise<{ opportunityId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!params.opportunityId) {
    return new NextResponse("Opportunity ID is required", { status: 400 });
  }

  const body = await req.json();

  const { destination } = body;

  try {
    // Verify user has access to this opportunity before updating
    const opportunity = await prismadb.crm_Opportunities.findFirst({
      where: {
        id: params.opportunityId,
        assigned_to: session.user.id,
      },
    });

    if (!opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found or access denied" },
        { status: 403 }
      );
    }

    await prismadb.crm_Opportunities.update({
      where: {
        id: params.opportunityId,
      },
      data: {
        sales_stage: destination,
      },
    });

    // Return only opportunities assigned to the current user
    const data = await prismadb.crm_Opportunities.findMany({
      where: {
        assigned_to: session.user.id,
      },
      include: {
        assigned_to_user: {
          select: {
            avatar: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      { message: "Opportunity updated", data },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update opportunity" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ opportunityId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!params.opportunityId) {
    return new NextResponse("Opportunity ID is required", { status: 400 });
  }

  try {
    // Verify user has access to this opportunity before deletion
    const opportunity = await prismadb.crm_Opportunities.findFirst({
      where: {
        id: params.opportunityId,
        assigned_to: session.user.id,
      },
    });

    if (!opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found or access denied" },
        { status: 403 }
      );
    }

    await prismadb.crm_Opportunities.delete({
      where: {
        id: params.opportunityId,
      },
    });

    return NextResponse.json(
      { message: "Opportunity deleted" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete opportunity" },
      { status: 500 }
    );
  }
}
