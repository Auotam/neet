import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">Paper not found</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        That slug does not match any bundled mock. Return home and pick one of
        the thirty listed papers.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white"
      >
        Home
      </Link>
    </div>
  );
}
