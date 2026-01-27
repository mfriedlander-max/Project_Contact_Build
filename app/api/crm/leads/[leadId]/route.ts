import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prismadb } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request, props: { params: Promise<{ leadId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!params.leadId) {
    return new NextResponse("Lead ID is required", { status: 400 });
  }

  try {
    // Verify user has access to this lead before deletion
    const lead = await prismadb.crm_Leads.findFirst({
      where: {
        id: params.leadId,
        assigned_to: session.user.id,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead not found or access denied" },
        { status: 403 }
      );
    }

    await prismadb.crm_Leads.delete({
      where: {
        id: params.leadId,
      },
    });

    return NextResponse.json({ message: "Lead deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 }
    );
  }
}
