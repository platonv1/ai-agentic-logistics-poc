import { NextRequest } from "next/server";
import {
  addChatMessage,
  addEvent,
  getDriver,
  getOrder,
  getOrderChatHistory,
  Order,
} from "@/lib/data";
import { AgentResult, runAgent } from "@/lib/llm";

function buildMockResult(order: Order, message: string): AgentResult {
  const lower = message.toLowerCase();

  if (order.exception) {
    return {
      reasoning: `Order has an open exception (${order.exception}); leading with that context so the customer isn't caught off guard.`,
      action: `We're currently working through an issue with your delivery — ${
        order.escalated
          ? "a team member is reviewing it and will follow up shortly."
          : `we've already adjusted your delivery and your new ETA is ${order.eta}.`
      }`,
      confidence: 0.8,
    };
  }

  if (lower.includes("where") || lower.includes("eta") || lower.includes("when")) {
    return {
      reasoning: "Customer is asking for delivery timing; order status has no open exceptions, so I can answer directly from live order data.",
      action: `Your order is currently ${order.status.replace(
        "_",
        " "
      )} and on track for ${order.eta}.`,
      confidence: 0.92,
    };
  }

  if (lower.includes("driver") || lower.includes("who")) {
    const driver = order.driverId ? getDriver(order.driverId) : null;
    return {
      reasoning: "Customer wants to know who's delivering; looked up the assigned driver from live dispatch data.",
      action: driver
        ? `${driver.name} has your delivery and is currently ${driver.status.replace("_", " ")}.`
        : `Your order hasn't been assigned to a driver yet — it's still in our queue.`,
      confidence: 0.88,
    };
  }

  return {
    reasoning: "General question without a specific data hook — giving a helpful default grounded in current order status.",
    action: `Thanks for reaching out! Your order (${order.id}) is ${order.status.replace(
      "_",
      " "
    )}, expected by ${order.eta}. Let me know if you have a specific question about it.`,
    confidence: 0.7,
  };
}

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId");
  if (!orderId) {
    return Response.json({ error: "orderId is required" }, { status: 400 });
  }
  const order = getOrder(orderId);
  if (!order) {
    return Response.json({ error: `Unknown order ${orderId}` }, { status: 404 });
  }
  return Response.json({ order, messages: getOrderChatHistory(orderId) });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { orderId, message } = body as { orderId: string; message: string };

  const order = getOrder(orderId);
  if (!order) {
    return Response.json({ error: `Unknown order ${orderId}` }, { status: 404 });
  }

  addChatMessage({ orderId, role: "customer", text: message });

  const driver = order.driverId ? getDriver(order.driverId) : null;
  const history = getOrderChatHistory(orderId)
    .slice(-6)
    .map((m) => `${m.role}: ${m.text}`)
    .join("\n");

  const systemPrompt = `You are the Proactive Customer Communication Agent for a last-mile delivery platform, chatting directly with a customer. You have live access to their order status. Respond with ONLY a JSON object: {"reasoning": string (your internal reasoning, not shown to the customer), "action": string (the actual reply message to send the customer), "confidence": number between 0 and 1}. Keep the customer-facing reply short, warm, and specific to their order — never invent details not given to you.`;

  const userPrompt = `Order ${orderId}: status=${order.status}, eta=${order.eta}, exception=${
    order.exception ?? "none"
  }, escalated=${order.escalated}, driver=${driver ? driver.name : "unassigned"}.
Recent conversation:
${history}
Reply to the customer's latest message: "${message}"`;

  const result = await runAgent({
    systemPrompt,
    userPrompt,
    mockResult: () => buildMockResult(order, message),
  });

  addChatMessage({ orderId, role: "agent", text: result.action });

  const event = addEvent({
    agent: "communication",
    orderId,
    reasoning: result.reasoning,
    action: result.action,
    confidence: result.confidence,
  });

  return Response.json({
    result,
    messages: getOrderChatHistory(orderId),
    event,
  });
}
