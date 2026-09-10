import { notFound } from "next/navigation";
import { getOrder, getOrderChatHistory } from "@/lib/data";
import TrackingChat from "./TrackingChat";

export const dynamic = "force-dynamic";

export default async function TrackPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = getOrder(orderId);
  if (!order) notFound();

  return <TrackingChat order={order} initialMessages={getOrderChatHistory(orderId)} />;
}
