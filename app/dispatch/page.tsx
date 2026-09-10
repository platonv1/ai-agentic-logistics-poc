import Link from "next/link";
import LoginForm from "./LoginForm";

export default function DispatchLoginPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-start justify-center gap-6 px-6 py-24">
      <span className="rounded-full border border-amber-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-500">
        Internal tool
      </span>
      <h1 className="text-2xl font-semibold leading-tight">
        Dispatch staff sign-in
      </h1>
      <p className="text-sm leading-6 text-gray-500">
        This console is for delivery company ops/dispatch staff only. It is{" "}
        <strong>not</strong> the page for tracking your own delivery.
      </p>
      <p className="text-sm leading-6 text-gray-500">
        Looking to track a package instead?{" "}
        <Link href="/" className="text-blue-600 underline">
          Go to the customer tracking page
        </Link>
        .
      </p>
      <LoginForm />
      <p className="text-xs text-gray-400">
        Prototype demo login — credentials are documented in USER-GUIDE.md.
      </p>
    </main>
  );
}
