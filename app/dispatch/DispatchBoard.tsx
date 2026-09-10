"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Driver, EventLogEntry, ExceptionType, Order } from "@/lib/data";

const EXCEPTION_OPTIONS: { value: ExceptionType; label: string }[] = [
  { value: "failed_attempt", label: "Failed delivery attempt" },
  { value: "address_issue", label: "Address issue" },
  { value: "traffic_delay", label: "Traffic / weather delay" },
  { value: "recipient_no_show", label: "Recipient no-show" },
];

const STATUS_STYLES: Record<Order["status"], string> = {
  pending: "bg-gray-100 text-gray-700",
  assigned: "bg-blue-100 text-blue-700",
  en_route: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  exception: "bg-red-100 text-red-700",
};

export default function DispatchBoard({
  initialOrders,
  initialDrivers,
  initialEventLog,
}: {
  initialOrders: Order[];
  initialDrivers: Driver[];
  initialEventLog: EventLogEntry[];
}) {
  const router = useRouter();
  const [selectedOrderId, setSelectedOrderId] = useState(
    initialOrders[0]?.id ?? ""
  );
  const [selectedException, setSelectedException] =
    useState<ExceptionType>("failed_attempt");
  const [pending, setPending] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  async function runAction(label: string, url: string, body: unknown) {
    setPending(label);
    setLastError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setLastError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Dispatch Console</h1>
        <p className="text-sm text-gray-500">
          Live agentic dispatch for last-mile delivery — simulate an exception
          or a new order and watch the agents react.
        </p>
      </header>

      <section className="flex flex-wrap gap-4 items-end rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Order</label>
          <select
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
          >
            {initialOrders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id} — {o.customerName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">
            Exception type
          </label>
          <select
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={selectedException}
            onChange={(e) =>
              setSelectedException(e.target.value as ExceptionType)
            }
          >
            {EXCEPTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <button
          className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          disabled={pending !== null || !selectedOrderId}
          onClick={() =>
            runAction("exception", "/api/agents/exceptions", {
              orderId: selectedOrderId,
              exceptionType: selectedException,
            })
          }
        >
          {pending === "exception" ? "Resolving…" : "Simulate exception"}
        </button>
        <button
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          disabled={pending !== null}
          onClick={() =>
            runAction("dispatch", "/api/agents/dispatch", {
              createOrder: true,
            })
          }
        >
          {pending === "dispatch" ? "Dispatching…" : "Add new order & dispatch"}
        </button>
        {lastError && <p className="text-sm text-red-600">{lastError}</p>}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Shipments
          </h2>
          <div className="flex flex-col gap-2">
            {initialOrders.map((order) => {
              const driver = initialDrivers.find((d) => d.id === order.driverId);
              return (
                <div
                  key={order.id}
                  className="rounded-lg border border-gray-200 p-3 text-sm flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {order.id} · {order.customerName}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status]}`}
                    >
                      {order.status.replace("_", " ")}
                      {order.escalated ? " · needs review" : ""}
                    </span>
                  </div>
                  <span className="text-gray-500">{order.address}</span>
                  <span className="text-gray-500">
                    ETA {order.eta} · {driver ? driver.name : "unassigned"}
                    {order.priority === "high" ? " · high priority" : ""}
                  </span>
                  {order.exception && (
                    <span className="text-red-600 text-xs">
                      Exception: {order.exception.replace("_", " ")}
                    </span>
                  )}
                  <a
                    href={`/track/${order.id}`}
                    className="text-xs text-blue-600 underline w-fit"
                  >
                    View customer tracking page
                  </a>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Agent activity log
          </h2>
          <div className="flex flex-col gap-2 max-h-[32rem] overflow-y-auto">
            {initialEventLog.length === 0 && (
              <p className="text-sm text-gray-400">
                No agent activity yet — trigger an action above.
              </p>
            )}
            {initialEventLog.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-gray-200 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">
                    {event.agent} agent
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {event.orderId && (
                  <span className="text-xs text-gray-500">{event.orderId}</span>
                )}
                <p className="mt-1 text-gray-700">{event.reasoning}</p>
                <p className="mt-1 text-xs font-medium">
                  Action: {event.action}
                  {event.confidence !== null &&
                    ` · confidence ${(event.confidence * 100).toFixed(0)}%`}
                  {event.escalated && " · escalated to human"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
