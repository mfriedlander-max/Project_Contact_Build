"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Row } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { opportunitySchema } from "../table-data/schema";
import { useRouter } from "next/navigation";
import AlertModal from "@/components/modals/alert-modal";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import axios from "axios";
import RightViewModalNoTrigger from "@/components/modals/right-view-notrigger";
import { UpdateContactForm } from "../components/UpdateContactForm";
import { Loader2, Mail, Sparkles } from "lucide-react";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const router = useRouter();
  const contact = opportunitySchema.parse(row.original);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [findingEmail, setFindingEmail] = useState(false);
  const [generatingInsert, setGeneratingInsert] = useState(false);

  const { toast } = useToast();

  const onFindEmail = async () => {
    if (!contact?.company || !contact?.first_name || !contact?.last_name) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Company, first name, and last name are required to find email.",
      });
      return;
    }

    setFindingEmail(true);
    try {
      const response = await axios.post("/api/hunter/find-email", {
        contactId: contact.id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        company: contact.company,
      });

      toast({
        title: "Email Found",
        description: `Found: ${response.data.email} (${response.data.confidence} confidence)`,
      });
      router.refresh();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast({
        variant: "destructive",
        title: "Error",
        description: axiosError.response?.data?.error || "Failed to find email. Please try again.",
      });
    } finally {
      setFindingEmail(false);
    }
  };

  const onGenerateInsert = async () => {
    if (!contact?.company || !contact?.first_name || !contact?.last_name) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Company, first name, and last name are required to generate insert.",
      });
      return;
    }

    setGeneratingInsert(true);
    try {
      const response = await axios.post("/api/personalization/generate", {
        contactId: contact.id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        company: contact.company,
        position: contact.position,
        linkedinUrl: contact.social_linkedin,
      });

      toast({
        title: "Insert Generated",
        description: `Generated with ${response.data.confidence} confidence`,
      });
      router.refresh();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast({
        variant: "destructive",
        title: "Error",
        description: axiosError.response?.data?.error || "Failed to generate insert. Please try again.",
      });
    } finally {
      setGeneratingInsert(false);
    }
  };

  const onDelete = async () => {
    setLoading(true);
    try {
      await axios.delete(`/api/crm/contacts/${contact?.id}`);
      toast({
        title: "Success",
        description: "Opportunity has been deleted",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Something went wrong while deleting opportunity. Please try again.",
      });
    } finally {
      setLoading(false);
      setOpen(false);
      router.refresh();
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
      <RightViewModalNoTrigger
        title={
          "Update Contact" +
          " - " +
          contact?.first_name +
          " " +
          contact?.last_name
        }
        description="Update contact details"
        open={updateOpen}
        setOpen={setUpdateOpen}
      >
        <UpdateContactForm initialData={row.original} setOpen={setUpdateOpen} />
      </RightViewModalNoTrigger>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          >
            <DotsHorizontalIcon className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]">
          <DropdownMenuItem
            onClick={() => router.push(`/crm/contacts/${contact?.id}`)}
          >
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setUpdateOpen(true)}>
            Update
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Sparkles className="mr-2 h-4 w-4" />
              Workflow
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={onFindEmail}
                disabled={findingEmail || !contact?.company}
              >
                {findingEmail ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Find Email
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onGenerateInsert}
                disabled={generatingInsert || !contact?.company}
              >
                {generatingInsert ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Insert
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpen(true)}>
            Delete
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
