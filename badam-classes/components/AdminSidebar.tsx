import Link from "next/link";

export default function AdminSidebar() {
  return (
    <aside className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-xl font-bold">Admin</h2>
      <div className="mt-4 space-y-2 text-sm text-white/70">
        <Link href="/admin" className="block">Overview</Link>
        <Link href="/admin/courses" className="block">Courses</Link>
        <Link href="/admin/students" className="block">Students</Link>
        <Link href="/admin/payments" className="block">Payments</Link>
        <Link href="/admin/notes" className="block">Notes</Link>
        <Link href="/admin/current-affairs" className="block">Current Affairs</Link>
      </div>
    </aside>
  );
}
