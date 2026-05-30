import Link from "next/link";

export default function DashboardSidebar() {
  return (
    <aside className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-xl font-bold">Dashboard</h2>
      <div className="mt-4 space-y-2 text-sm text-white/70">
        <Link href="/dashboard" className="block">Overview</Link>
        <Link href="/dashboard/my-courses" className="block">My Courses</Link>
        <Link href="/dashboard/my-notes" className="block">My Notes</Link>
        <Link href="/dashboard/my-tests" className="block">My Tests</Link>
        <Link href="/dashboard/live-classes" className="block">Live Classes</Link>
      </div>
    </aside>
  );
}
