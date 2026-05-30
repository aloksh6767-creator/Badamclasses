import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
      <div className="container-main flex items-center justify-between py-4">
        <Link href="/" className="text-xl font-bold text-white">
          Badam Classes
        </Link>
        <nav className="flex gap-4 text-sm text-white/80">
          <Link href="/courses">Courses</Link>
          <Link href="/current-affairs">Current Affairs</Link>
          <Link href="/results">Results</Link>
          <Link href="/login">Login</Link>
        </nav>
      </div>
    </header>
  );
}
