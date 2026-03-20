import { redirect } from "next/navigation";

export default async function ConversionsRedirect({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  redirect(`/dashboard/${siteId}/events`);
}
