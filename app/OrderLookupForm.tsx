"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function OrderLookupForm({
  placeholder = "e.g. ord-1001",
}: {
  placeholder?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const orderId = value.trim();
    if (!orderId) return;
    router.push(`/track/${encodeURIComponent(orderId)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Order number"
      />
      <button
        type="submit"
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={!value.trim()}
      >
        Track
      </button>
    </form>
  );
}
