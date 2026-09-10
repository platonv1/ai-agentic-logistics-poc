import { NextRequest } from "next/server";
import {
  addEvent,
  addRandomPendingOrder,
  drivers,
  getDriver,
  Order,
  orders,
} from "@/lib/data";
import { AgentResult, runAgent } from "@/lib/llm";

const VALID_ACTIONS = ["assign_driver", "queue"] as const;
type DispatchAction = (typeof VALID_ACTIONS)[number];

function pickBestDriver() {
  return [...drivers]
    .filter((d) => d.status !== "off_shift" && d.activeOrderIds.length < d.capacity)
    .sort((a, b) => {
      // Prefer already-available drivers, then the least-loaded one.
      if (a.status !== b.status) return a.status === "available" ? -1 : 1;
      return a.activeOrderIds.length - b.activeOrderIds.length;
    })[0];
}

function buildMockResult(order: Order): AgentResult {
  const bestDriver = pickBestDriver();
  if (bestDriver) {
    return {
      reasoning: `${bestDriver.name} has the lowest current load (${bestDriver.activeOrderIds.length}/${bestDriver.capacity}) among drivers who can take another stop, and is close enough to reach ${order.address} without breaking other drivers' routes.`,
      action: "assign_driver",
      confidence: 0.88,
    };
  }
  return {
    reasoning: `Every driver is at capacity or off shift right now. Forcing an assignment would blow another route's SLA, so it's safer to queue ${order.id} until a driver frees up.`,
    action: "queue",
    confidence: 0.75,
  };
}

function applyAction(action: DispatchAction, order: Order) {
  if (action === "assign_driver") {
    const bestDriver = pickBestDriver();
    if (bestDriver) {
      bestDriver.activeOrderIds.push(order.id);
      order.driverId = bestDriver.id;
      order.status = "assigned";
      return bestDriver;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { orderId, createOrder } = body as {
    orderId?: string;
    createOrder?: boolean;
  };

  const order = createOrder
    ? addRandomPendingOrder()
    : orderId
    ? orders.find((o) => o.id === orderId) ?? null
    : orders.find((o) => o.status === "pending" && !o.driverId) ?? null;

  if (!order) {
    return Response.json(
      { message: "No unassigned orders — fleet is already optimally balanced." },
      { status: 200 }
    );
  }

  const fleetSummary = drivers
    .map(
      (d) =>
        `${d.name} (${d.status}, ${d.activeOrderIds.length}/${d.capacity} active orders, based at ${d.location})`
    )
    .join("; ");

  const systemPrompt = `You are the Dynamic Dispatch & Route Optimization Agent for a last-mile delivery platform. Given one unassigned order and current fleet state, decide the best next action. Respond with ONLY a JSON object: {"reasoning": string, "action": one of ${JSON.stringify(
    VALID_ACTIONS
  )}, "confidence": number between 0 and 1}. Balance SLA (priority orders matter more), cost, and driver load — don't overload a driver just because they're closest.`;

  const userPrompt = `New/unassigned order ${order.id} for ${order.customerName} at ${order.address} (priority: ${order.priority}, target ETA: ${order.eta}).
Fleet status: ${fleetSummary}.
Decide whether to assign a driver now or queue the order.`;

  const result = await runAgent({
    systemPrompt,
    userPrompt,
    mockResult: () => buildMockResult(order),
  });

  let assignedDriver = null;
  if (VALID_ACTIONS.includes(result.action as DispatchAction)) {
    assignedDriver = applyAction(result.action as DispatchAction, order);
  }

  const event = addEvent({
    agent: "dispatch",
    orderId: order.id,
    reasoning: result.reasoning,
    action: result.action,
    confidence: result.confidence,
  });

  return Response.json({
    result,
    order,
    driver: assignedDriver ? getDriver(assignedDriver.id) : null,
    event,
  });
}
