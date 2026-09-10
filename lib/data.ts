export type DriverStatus = "available" | "en_route" | "off_shift";

export interface Driver {
  id: string;
  name: string;
  status: DriverStatus;
  location: string;
  activeOrderIds: string[];
  capacity: number;
}

export type OrderStatus =
  | "pending"
  | "assigned"
  | "en_route"
  | "delivered"
  | "exception";

export type ExceptionType =
  | "failed_attempt"
  | "address_issue"
  | "traffic_delay"
  | "recipient_no_show";

export interface Order {
  id: string;
  customerName: string;
  address: string;
  eta: string;
  status: OrderStatus;
  driverId: string | null;
  exception: ExceptionType | null;
  /** Set when the Exception Resolution Agent's confidence fell below the
   * autonomy threshold and the exception needs human sign-off. */
  escalated: boolean;
  priority: "standard" | "high";
}

export interface EventLogEntry {
  id: string;
  timestamp: string;
  agent: "exception" | "dispatch" | "communication" | "system";
  orderId: string | null;
  reasoning: string;
  action: string;
  confidence: number | null;
  escalated?: boolean;
}

export interface ChatMessage {
  id: string;
  orderId: string;
  role: "customer" | "agent";
  text: string;
  timestamp: string;
}

interface NewOrderTemplate {
  customerName: string;
  address: string;
  eta: string;
}

const NEW_ORDER_POOL: NewOrderTemplate[] = [
  { customerName: "Nadia Farrow", address: "77 Cedar Bluff Rd", eta: "3:45 PM" },
  { customerName: "Owen Vasquez", address: "134 Lakeshore Dr", eta: "4:30 PM" },
  { customerName: "Ines Moreau", address: "21 Willowbrook Cir", eta: "2:50 PM" },
  { customerName: "Ravi Sethi", address: "560 Pinecrest Ave", eta: "5:20 PM" },
  { customerName: "Hana Kobayashi", address: "8 Orchard Hill Ln", eta: "3:10 PM" },
];

interface Store {
  drivers: Driver[];
  orders: Order[];
  eventLog: EventLogEntry[];
  chatMessages: ChatMessage[];
  nextEventId: number;
  nextChatId: number;
  nextOrderId: number;
  nextNewOrderTemplate: number;
}

function createSeedStore(): Store {
  return {
    drivers: [
      {
        id: "drv-1",
        name: "Marcus Webb",
        status: "available",
        location: "Downtown Depot",
        activeOrderIds: ["ord-1001"],
        capacity: 6,
      },
      {
        id: "drv-2",
        name: "Priya Nair",
        status: "en_route",
        location: "Riverside District",
        activeOrderIds: ["ord-1002", "ord-1003"],
        capacity: 6,
      },
      {
        id: "drv-3",
        name: "Diego Alvarez",
        status: "available",
        location: "North Yard",
        activeOrderIds: ["ord-1004"],
        capacity: 5,
      },
      {
        id: "drv-4",
        name: "Sara Kline",
        status: "off_shift",
        location: "Downtown Depot",
        activeOrderIds: [],
        capacity: 6,
      },
    ],
    orders: [
      {
        id: "ord-1001",
        customerName: "Amelia Chen",
        address: "412 Birchwood Ave",
        eta: "2:30 PM",
        status: "assigned",
        driverId: "drv-1",
        exception: null,
        escalated: false,
        priority: "standard",
      },
      {
        id: "ord-1002",
        customerName: "Jordan Blake",
        address: "88 Harbor View Ln",
        eta: "1:15 PM",
        status: "en_route",
        driverId: "drv-2",
        exception: null,
        escalated: false,
        priority: "high",
      },
      {
        id: "ord-1003",
        customerName: "Tomas Reyes",
        address: "220 Fulton St",
        eta: "3:00 PM",
        status: "en_route",
        driverId: "drv-2",
        exception: null,
        escalated: false,
        priority: "standard",
      },
      {
        id: "ord-1004",
        customerName: "Grace Okafor",
        address: "15 Meridian Ct",
        eta: "4:10 PM",
        status: "assigned",
        driverId: "drv-3",
        exception: null,
        escalated: false,
        priority: "standard",
      },
      {
        id: "ord-1005",
        customerName: "Liam Park",
        address: "9 Sequoia Pkwy",
        eta: "5:00 PM",
        status: "pending",
        driverId: null,
        exception: null,
        escalated: false,
        priority: "standard",
      },
    ],
    eventLog: [],
    chatMessages: [],
    nextEventId: 1,
    nextChatId: 1,
    nextOrderId: 1006,
    nextNewOrderTemplate: 0,
  };
}

// Next.js compiles Route Handlers and Server Components as separate module
// graphs, so a plain module-level `let`/array is NOT guaranteed to be the same
// instance across app/api/**/route.ts and app/**/page.tsx (confirmed: agent
// routes shared state with each other but not with the dashboard page).
// Stashing the store on `globalThis` guarantees one instance per Node process,
// which is exactly what "in-memory store" is supposed to mean here.
declare global {
  var __logisticsStore: Store | undefined;
}

const store = globalThis.__logisticsStore ?? createSeedStore();
globalThis.__logisticsStore = store;

export const drivers = store.drivers;
export const orders = store.orders;
export const eventLog = store.eventLog;
export const chatMessages = store.chatMessages;

export function addEvent(entry: Omit<EventLogEntry, "id" | "timestamp">) {
  const event: EventLogEntry = {
    ...entry,
    id: `evt-${store.nextEventId++}`,
    timestamp: new Date().toISOString(),
  };
  eventLog.unshift(event);
  return event;
}

export function addChatMessage(entry: Omit<ChatMessage, "id" | "timestamp">) {
  const message: ChatMessage = {
    ...entry,
    id: `chat-${store.nextChatId++}`,
    timestamp: new Date().toISOString(),
  };
  chatMessages.push(message);
  return message;
}

export function getOrder(orderId: string) {
  return orders.find((o) => o.id === orderId) ?? null;
}

export function getDriver(driverId: string) {
  return drivers.find((d) => d.id === driverId) ?? null;
}

export function getOrderChatHistory(orderId: string) {
  return chatMessages.filter((m) => m.orderId === orderId);
}

export function addRandomPendingOrder() {
  const template = NEW_ORDER_POOL[store.nextNewOrderTemplate % NEW_ORDER_POOL.length];
  store.nextNewOrderTemplate++;
  const order: Order = {
    id: `ord-${store.nextOrderId++}`,
    customerName: template.customerName,
    address: template.address,
    eta: template.eta,
    status: "pending",
    driverId: null,
    exception: null,
    escalated: false,
    priority: "standard",
  };
  orders.push(order);
  return order;
}
