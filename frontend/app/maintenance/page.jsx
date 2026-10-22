import Image from "next/image";

export const metadata = {
  title: "Website Maintenance",
  robots: { index: false, follow: false }
};

export default function MaintenancePage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center overflow-x-hidden px-4 py-6 text-slate-100 sm:px-5 sm:py-12">
      <section className="w-full max-w-xl rounded-3xl border border-orange-300/25 bg-[#0d1a3a]/90 p-5 text-center shadow-2xl sm:p-10">
        <div className="relative mx-auto h-20 w-full max-w-64 overflow-hidden rounded-2xl border border-white/10 bg-white">
          <Image
            src="/new-logo.webp"
            alt="Badam Singh Classes"
            fill
            priority
            sizes="(max-width: 640px) 80vw, 256px"
            className="object-contain"
          />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-orange-300 sm:mt-7 sm:tracking-[0.24em]">Scheduled Maintenance</p>
        <h1 className="mt-3 font-display text-[1.75rem] font-bold leading-tight text-white sm:text-4xl">We&apos;ll be back shortly</h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-6 text-slate-300 sm:text-base sm:leading-7">
          BadamClasses is being updated to improve your learning experience. Please try again after some time.
        </p>
        <p className="mt-4 text-sm leading-5 text-slate-400 sm:mt-5">Your account, purchases and course progress remain safe.</p>
      </section>
    </main>
  );
}
