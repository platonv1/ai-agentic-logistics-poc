import { cookies } from "next/headers";
import { drivers, eventLog, orders } from "@/lib/data";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth";
import DispatchBoard from "../DispatchBoard";

export const dynamic = "force-dynamic";

export default async function DispatchConsolePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  return (
    <DispatchBoard
      initialOrders={orders}
      initialDrivers={drivers}
      initialEventLog={eventLog}
      displayName={session?.displayName ?? "Staff"}
    />
  );
}
