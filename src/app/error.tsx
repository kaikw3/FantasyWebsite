"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-start justify-center gap-4 px-6 py-24">
      <h1 className="text-2xl font-semibold text-white">Could not load the schedule</h1>
      <p className="text-sm text-slate-400">
        The NHL public API is required for this page. {error.message}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-cyan-500/20 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/30"
      >
        Try again
      </button>
    </main>
  );
}
