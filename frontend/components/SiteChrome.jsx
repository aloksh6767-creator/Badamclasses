"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatbotWidget from "@/components/ChatbotWidget";
import ScrollProgress from "@/components/ScrollProgress";
import FloatingEnrollButton from "@/components/FloatingEnrollButton";
import BackToTop from "@/components/BackToTop";

export default function SiteChrome({ children }) {
  const pathname = usePathname() || "";
  const isSaasRoute = pathname === "/ai-saas" || pathname.startsWith("/ai-saas/");
  const isLiveRoute = pathname === "/live" || pathname.startsWith("/live/");

  if (isSaasRoute) {
    return children;
  }

  return (
    <>
      <ScrollProgress />
      <Navbar />
      {children}
      <Footer />
      <FloatingEnrollButton />
      <BackToTop />
      {!isLiveRoute ? <ChatbotWidget /> : null}
    </>
  );
}
