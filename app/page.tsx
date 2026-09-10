import { orders } from "@/lib/data";

export default function Home() {
  const sampleOrderId = orders[0]?.id ?? "ord-1001";

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
      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href="/dispatch"
          className="rounded bg-black px-5 py-3 text-sm font-medium text-white"
        >
          Open dispatch console
        </a>
        <a
          href={`/track/${sampleOrderId}`}
          className="rounded border border-gray-300 px-5 py-3 text-sm font-medium"
        >
          Open customer tracking
        </a>
      </div>
    </main>
  );
}
