import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prismadb } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

//Contact delete route
export async function DELETE(req: Request, props: { params: Promise<{ contactId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!params.contactId) {
    return new NextResponse("contact ID is required", { status: 400 });
  }

  try {
    // Verify user has access to this contact before deletion
    const contact = await prismadb.crm_Contacts.findFirst({
      where: {
        id: params.contactId,
        assigned_to: session.user.id,
      },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found or access denied" },
        { status: 403 }
      );
    }

    await prismadb.crm_Contacts.delete({
      where: {
        id: params.contactId,
      },
    });

    return NextResponse.json({ message: "Contact deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
