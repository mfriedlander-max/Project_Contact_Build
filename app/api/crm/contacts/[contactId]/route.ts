import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { prismadb } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const CONNECTION_STAGES = [
  "DRAFTED",
  "MESSAGE_SENT",
  "DIDNT_CONNECT",
  "CONNECTED",
  "IN_TOUCH",
] as const;

const patchContactSchema = z.object({
  connection_stage: z.enum(CONNECTION_STAGES),
});

//Contact stage update route
export async function PATCH(
  req: Request,
  props: { params: Promise<{ contactId: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = patchContactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors },
        { status: 400 }
      );
    }

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

    const updated = await prismadb.crm_Contacts.update({
      where: { id: params.contactId },
      data: { connection_stage: parsed.data.connection_stage },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update contact stage" },
      { status: 500 }
    );
  }
}

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
