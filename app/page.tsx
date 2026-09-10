import Link from "next/link";
import { orders } from "@/lib/data";
import OrderLookupForm from "./OrderLookupForm";

export default function Home() {
  const sampleOrderIds = orders.slice(0, 3).map((o) => o.id);

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col items-start justify-center gap-6 px-6 py-24">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Case study POC
      </p>
      <h1 className="text-3xl font-semibold leading-tight">
        AI-First Agentic Logistics
      </h1>
      <p className="text-base leading-7 text-gray-600">
        A last-mile delivery dispatch prototype driven by three live LLM
        agents: exception resolution, dynamic dispatch &amp; route
        optimization, and proactive customer communication.
      </p>

      <a
        href="/dispatch"
        className="rounded bg-black px-5 py-3 text-sm font-medium text-white"
      >
        Open dispatch console
      </a>

      <div className="mt-2 w-full border-t border-gray-200 pt-6">
        <h2 className="text-sm font-semibold text-gray-700">
          Track a delivery
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter an order number to open the customer tracking &amp; chat page.
        </p>
        <div className="mt-3">
          <OrderLookupForm />
        </div>
        <p className="mt-3 text-xs text-gray-400">
          No order number handy? Try{" "}
          {sampleOrderIds.map((id, i) => (
            <span key={id}>
              <Link href={`/track/${id}`} className="text-blue-600 underline">
                {id}
              </Link>
              {i < sampleOrderIds.length - 1 ? ", " : ""}
            </span>
          ))}
          .
        </p>
      </div>
    </main>
  );
}
