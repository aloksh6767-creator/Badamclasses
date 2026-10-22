"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatbotWidget from "@/components/ChatbotWidget";
import ScrollProgress from "@/components/ScrollProgress";
import FloatingEnrollButton from "@/components/FloatingEnrollButton";
import BackToTop from "@/components/BackToTop";
import AnnouncementTicker from "@/components/AnnouncementTicker";
import SiteNotificationPopup from "@/components/SiteNotificationPopup";

export default function SiteChrome({ children }) {
  const pathname = usePathname() || "";
  const isSaasRoute = pathname === "/ai-saas" || pathname.startsWith("/ai-saas/");
  const isLiveRoute = pathname === "/live" || pathname.startsWith("/live/");
  const isMaintenanceRoute = pathname === "/maintenance";
  const isTestRankRoute = pathname === "/test-rank" || pathname.startsWith("/test-rank/");
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isSaasRoute || isMaintenanceRoute || isTestRankRoute || isAdminRoute) {
    return children;
  }

  return (
    <>
      <ScrollProgress />
      <Navbar />
      {!isLiveRoute ? <AnnouncementTicker /> : null}
      <div id="main-content" tabIndex={-1}>{children}</div>
      <Footer />
      {!isLiveRoute ? <FloatingEnrollButton /> : null}
      {!isLiveRoute ? <BackToTop /> : null}
      {!isLiveRoute ? <ChatbotWidget /> : null}
      {!isLiveRoute ? <SiteNotificationPopup /> : null}
    </>
  );
}
