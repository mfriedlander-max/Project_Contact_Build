import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prismadb } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request, props: { params: Promise<{ accountId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  try {
    // Verify user has access to this account before deletion
    const account = await prismadb.crm_Accounts.findFirst({
      where: {
        id: params.accountId,
        assigned_to: session.user.id,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found or access denied" },
        { status: 403 }
      );
    }

    await prismadb.crm_Accounts.delete({
      where: {
        id: params.accountId,
      },
    });

    return NextResponse.json({ message: "Account deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
