import { NextRequest } from "next/server";
import {
  addChatMessage,
  addEvent,
  drivers,
  ExceptionType,
  getDriver,
  getOrder,
} from "@/lib/data";
import { AgentResult, runAgent } from "@/lib/llm";

/** Below this confidence, the agent proposes an action but escalates to a human
 * instead of applying it autonomously. */
const CONFIDENCE_THRESHOLD = 0.7;

const VALID_ACTIONS = [
  "reschedule",
  "reroute",
  "notify_customer",
  "reassign_driver",
] as const;
type ExceptionAction = (typeof VALID_ACTIONS)[number];

const EXCEPTION_LABELS: Record<ExceptionType, string> = {
  failed_attempt: "a failed delivery attempt",
  address_issue: "an address that could not be matched",
  traffic_delay: "a significant traffic/weather delay",
  recipient_no_show: "the recipient not being available",
};

function buildMockResult(
  exceptionType: ExceptionType,
  orderId: string
): AgentResult {
  switch (exceptionType) {
    case "failed_attempt":
      return {
        reasoning: `Delivery attempt failed for ${orderId} but the address is confirmed valid and the driver is still on shift. Rescheduling for the next available window is routine and low-risk.`,
        action: "reschedule",
        confidence: 0.85,
      };
    case "traffic_delay":
      return {
        reasoning: `${orderId} is delayed by traffic, but an alternate route with a similar ETA is available and the driver has capacity to divert. Rerouting keeps the delivery on track without involving the customer.`,
        action: "reroute",
        confidence: 0.9,
      };
    case "address_issue":
      return {
        reasoning: `The address on ${orderId} doesn't match known geocoding data closely enough to guess confidently — sending the driver to the wrong location risks a second failed attempt. Recommending a customer confirmation before proceeding.`,
        action: "notify_customer",
        confidence: 0.5,
      };
    case "recipient_no_show":
      return {
        reasoning: `Recipient was unavailable for ${orderId}. Reassigning to a driver with a later route window could work, but current driver loads are close to capacity, so this carries some SLA risk.`,
        action: "reassign_driver",
        confidence: 0.6,
      };
  }
}

function applyAutonomousAction(
  action: ExceptionAction,
  orderId: string,
  exceptionType: ExceptionType
) {
  const order = getOrder(orderId);
  if (!order) return;

  switch (action) {
    case "reschedule":
      order.eta = "Tomorrow, 10:00 AM";
      order.status = "assigned";
      break;
    case "reroute":
      order.status = "en_route";
      break;
    case "notify_customer":
      order.status = "en_route";
      addChatMessage({
        orderId,
        role: "agent",
        text: `Heads up — we ran into ${EXCEPTION_LABELS[exceptionType]} with your delivery. We're on it and will keep you posted on any change to your ${order.eta} ETA.`,
      });
      break;
    case "reassign_driver": {
      const currentDriverId = order.driverId;
      const newDriver = drivers.find(
        (d) => d.status === "available" && d.id !== currentDriverId
      );
      if (newDriver) {
        if (currentDriverId) {
          const oldDriver = getDriver(currentDriverId);
          if (oldDriver) {
            oldDriver.activeOrderIds = oldDriver.activeOrderIds.filter(
              (id) => id !== orderId
            );
          }
        }
        newDriver.activeOrderIds.push(orderId);
        order.driverId = newDriver.id;
      }
      order.status = "assigned";
      break;
    }
  }

  order.exception = null;
  order.escalated = false;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { orderId, exceptionType } = body as {
    orderId: string;
    exceptionType: ExceptionType;
  };

  const order = getOrder(orderId);
  if (!order) {
    return Response.json({ error: `Unknown order ${orderId}` }, { status: 404 });
  }

  order.status = "exception";
  order.exception = exceptionType;
  order.escalated = false;

  const driver = order.driverId ? getDriver(order.driverId) : null;
  const fleetSummary = drivers
    .map(
      (d) =>
        `${d.name} (${d.status}, ${d.activeOrderIds.length}/${d.capacity} active orders)`
    )
    .join("; ");

  const systemPrompt = `You are the Exception Resolution Agent for a last-mile delivery platform. A delivery exception has occurred and you must decide the single best next action. Respond with ONLY a JSON object: {"reasoning": string, "action": one of ${JSON.stringify(
    VALID_ACTIONS
  )}, "confidence": number between 0 and 1}. Be honest about confidence — if the right call genuinely depends on information you don't have, use a lower confidence so a human can review it.`;

  const userPrompt = `Order ${orderId} for ${order.customerName} at ${
    order.address
  } (priority: ${order.priority}, current ETA: ${
    order.eta
  }) has encountered this exception: ${EXCEPTION_LABELS[exceptionType]}.
Assigned driver: ${driver ? `${driver.name} (${driver.status})` : "none"}.
Fleet status: ${fleetSummary}.
Decide the single best next action.`;

  const result = await runAgent({
    systemPrompt,
    userPrompt,
    mockResult: () => buildMockResult(exceptionType, orderId),
  });

  const escalated = result.confidence < CONFIDENCE_THRESHOLD;

  if (!escalated && VALID_ACTIONS.includes(result.action as ExceptionAction)) {
    applyAutonomousAction(result.action as ExceptionAction, orderId, exceptionType);
  } else {
    order.escalated = true;
  }

  const event = addEvent({
    agent: "exception",
    orderId,
    reasoning: result.reasoning,
    action: result.action,
    confidence: result.confidence,
    escalated,
  });

  return Response.json({ result, escalated, order: getOrder(orderId), event });
}
