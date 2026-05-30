import Link from "next/link";

const footerLinks = [
  { label: "About Us", href: "/about" },
  { label: "Courses", href: "/courses" },
  { label: "Batches", href: "/batches" },
  { label: "Mock Tests", href: "/mock-tests" },
  { label: "Current Affairs", href: "/current-affairs" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Conditions", href: "/terms" }
];

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <rect x="4" y="4" width="16" height="16" rx="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.9" cy="7.1" r="1" fill="currentColor" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path d="M21 8.2a3 3 0 0 0-2.1-2.1C17 5.6 12 5.6 12 5.6s-5 0-6.9.5A3 3 0 0 0 3 8.2a31.3 31.3 0 0 0 0 7.6 3 3 0 0 0 2.1 2.1c1.9.5 6.9.5 6.9.5s5 0 6.9-.5a3 3 0 0 0 2.1-2.1 31.3 31.3 0 0 0 0-7.6Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m10 9.4 5 2.6-5 2.6V9.4Z" fill="currentColor" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer
      id="contact"
      className="footer-wave relative animate-reveal border-t border-white/10 bg-[#071126] py-10"
    >
      <div className="mx-auto w-[94%] max-w-7xl">
        <div className="mb-6 grid gap-4 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 className="mb-3 font-display text-lg text-white">BadamClasses</h3>
            <p className="max-w-sm text-slate-400">
              Smart preparation platform for SSC, Railway, Banking and State exam aspirants.
            </p>
            <div className="mt-3 space-y-1 text-xs text-slate-400">
              <p>Support: support@badamclasses.com</p>
              <p>Helpline: +91 90000 11111</p>
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-white">Quick Links</h4>
            <div className="grid grid-cols-2 gap-2">
              {footerLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-slate-400 transition hover:text-orange-300"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-white">Social Media</h4>
            <div className="flex gap-3 text-slate-300">
              <a
                href="mailto:support@badamclasses.com"
                className="btn-anim rounded-md border border-white/15 px-3 py-1 hover:border-orange-300"
              >
                Email
              </a>
              <a
                href="tel:+919000011111"
                className="btn-anim rounded-md border border-white/15 px-3 py-1 hover:border-orange-300"
              >
                Call
              </a>
              <a
                href="https://www.instagram.com/badamsinghclassesgwalior/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open Badam Singh Classes on Instagram"
                className="btn-anim inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-1 hover:border-orange-300 hover:text-orange-300"
              >
                <InstagramIcon />
                Instagram
              </a>
              <a
                href="https://www.youtube.com/@badamsinghclasses7558"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open Badam Singh Classes on YouTube"
                className="btn-anim inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-1 hover:border-orange-300 hover:text-orange-300"
              >
                <YouTubeIcon />
                YouTube
              </a>
              <Link
                href="/contact"
                className="btn-anim rounded-md border border-white/15 px-3 py-1 hover:border-orange-300"
              >
                Contact Page
              </Link>
            </div>
          </div>
        </div>

        <p className="border-t border-white/10 pt-4 text-center text-sm text-slate-400">
          Copyright 2026 BadamClasses. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
