const featureItems = [
  {
    title: "Quality Education",
    text: "Learn from the best with our expert faculty.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v17H7.5A3.5 3.5 0 0 0 4 22V5.5Zm0 0A3.5 3.5 0 0 1 7.5 9H20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    title: "Proven Results",
    text: "Join thousands of successful students.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path d="M4 20h16M6 16l4-4 3 3 6-8m0 0v5m0-5h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    title: "Live & Recorded Classes",
    text: "Learn anytime, anywhere with flexible options.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path d="M4 5h16v14H4V5Zm7 4 5 3-5 3V9Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    title: "Doubt Support",
    text: "Get your doubts cleared by experts.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path d="M4 12a8 8 0 0 1 16 0v3a3 3 0 0 1-3 3h-2m-6 0H7a3 3 0 0 1-3-3v-3m5 6a3 3 0 0 0 6 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
];

const trustItems = [
  {
    title: "Secure & Safe",
    text: "Your data is protected with top security",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7">
        <path d="M12 3 5 6v5c0 4.6 2.9 7.9 7 10 4.1-2.1 7-5.4 7-10V6l-7-3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="m8.8 12 2.2 2.2 4.4-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    title: "Trusted by 50K+ Students",
    text: "Join thousands of learners across India",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7">
        <path d="M12 3.5 14.1 8l4.9.7-3.5 3.4.8 4.9-4.3-2.3L7.7 17l.8-4.9L5 8.7 9.9 8 12 3.5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M8 21h8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  },
  {
    title: "24/7 Support",
    text: "We are here to help whenever you need",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7">
        <path d="M12 6v6l3.5 2M21 12a9 9 0 1 1-3.1-6.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 3v4h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    title: "Excellence in Education",
    text: "Commitment to your success and growth",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7">
        <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M7 7H4v1a4 4 0 0 0 4 4m9-5h3v1a4 4 0 0 1-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
];

const sliderItems = [
  {
    src: "/students-carrying-bags.svg",
    alt: "Complete preparation tools",
    title: "Complete Preparation Tools",
    text: "Live Classes · Mock Tests · Video Lectures · PDFs"
  },
  {
    src: "/mega-test-3-banner.png",
    alt: "Mega test and result preparation",
    title: "Proven Result Practice",
    text: "Tests, analysis, and guided preparation"
  },
  {
    src: "/phoolbagh-new-batch-2026.png",
    alt: "New batch poster",
    title: "Fresh Batch Updates",
    text: "New classes, notices, and course access"
  }
];

export default function AuthShowcase({ mode = "login", children }) {
  const isSignup = mode === "signup";

  return (
    <main className="auth-stage relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />
      <div className="auth-orb auth-orb-three" />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-7xl flex-col justify-center gap-5">
        <div className="auth-shell grid overflow-hidden rounded-[1.45rem] border border-blue-300/30 shadow-[0_32px_90px_rgba(2,8,23,0.55)] lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.92fr)]">
          <div className="auth-brand-panel relative hidden min-h-[560px] overflow-hidden border-blue-300/25 bg-[#06265c]/70 p-7 lg:flex lg:flex-col lg:justify-center lg:border-r xl:p-9">
            <div className="auth-dot-grid" />
            <div className="auth-flame-watermark" />
            <div className="relative z-10">
              <p className="auth-kicker mb-4 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.26em] text-orange-300">Welcome Back!</p>
              <h2 className="font-display text-4xl font-bold leading-tight text-white xl:text-5xl">
                Welcome to <span className="text-orange-400">Badam Singh</span> Classes
              </h2>
              <p className="mt-5 max-w-lg text-base leading-8 text-slate-200">
                {isSignup ? "Create your student account, verify your details, and continue your learning journey with us." : "Login to access your dashboard, continue learning, and achieve your dreams with us."}
              </p>
              <div className="mt-6 h-0.5 w-12 rounded-full bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.75)]" />
            </div>

            <div className="auth-side-slider relative z-10 mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-[0_18px_44px_rgba(2,8,23,0.24)]">
              {sliderItems.map((item, index) => (
                <div key={item.title} className={`auth-slide auth-slide-${index + 1}`}>
                  <img src={item.src} alt={item.alt} className="auth-slide-img" />
                  <div className="min-w-0">
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </div>
              ))}
              <div className="auth-slide-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="relative z-10 mt-5 grid gap-4">
              {featureItems.map((item, index) => (
                <div key={item.title} className={`auth-feature auth-feature-${index + 1} flex items-center gap-4 text-slate-100`}>
                  <div className="auth-feature-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-blue-500/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_14px_32px_rgba(37,99,235,0.22)]">
                    {item.icon}
                  </div>
                  <div>
                    <h2 className="text-base font-bold leading-tight">{item.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>

          <div className="auth-form-card flex min-h-[560px] items-center justify-center bg-[#020b1f]/76 p-5 backdrop-blur-2xl sm:p-7 lg:p-9">
            {children}
          </div>
        </div>

        <div className="auth-proof-grid relative z-10 grid gap-4 rounded-[1.35rem] border border-blue-300/25 bg-white/[0.045] p-4 shadow-[0_20px_55px_rgba(2,8,23,0.34)] backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-4 lg:p-5">
          {trustItems.map((item, index) => (
            <div key={item.title} className={`auth-proof auth-proof-${index + 1} flex items-center gap-4 rounded-2xl px-2 py-3 text-slate-100`}>
              <div className="auth-proof-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-100">
                {item.icon}
              </div>
              <div>
                <h2 className="text-sm font-bold leading-tight">{item.title}</h2>
                <p className="mt-1 text-sm leading-5 text-slate-300">{item.text}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="relative z-10 text-center text-sm text-slate-400">
          &copy; 2024 Badam Singh Classes. All rights reserved.
        </p>
      </section>
    </main>
  );
}
