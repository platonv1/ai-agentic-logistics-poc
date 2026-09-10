import Link from "next/link";
import OrderLookupForm from "@/app/OrderLookupForm";

export default function OrderNotFound() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col items-start justify-center gap-6 px-6 py-24">
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that order</h1>
      <p className="text-sm text-gray-500">
        Double-check the order number and try again.
      </p>
      <div className="w-full">
        <OrderLookupForm />
      </div>
      <Link href="/" className="text-sm text-blue-600 underline">
        Back to home
      </Link>
    </main>
  );
}
