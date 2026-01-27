import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Container from "../../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getWorkflowStats } from "@/actions/crm/get-workflow-stats";
import { WorkflowDashboard } from "./_components/WorkflowDashboard";
import { authOptions } from "@/lib/auth";

const WorkflowPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const stats = await getWorkflowStats(session.user.id);

  return (
    <Container
      title="Workflow Dashboard"
      description="Track your networking outreach progress"
    >
      <Suspense fallback={<SuspenseLoading />}>
        <WorkflowDashboard stats={stats} />
      </Suspense>
    </Container>
  );
};

export default WorkflowPage;
