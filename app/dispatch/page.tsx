import { drivers, eventLog, orders } from "@/lib/data";
import DispatchBoard from "./DispatchBoard";

export const dynamic = "force-dynamic";

export default function DispatchPage() {
  return (
    <DispatchBoard
      initialOrders={orders}
      initialDrivers={drivers}
      initialEventLog={eventLog}
    />
  );
}
