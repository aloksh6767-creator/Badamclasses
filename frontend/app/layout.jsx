import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import StartupSanitizer from "@/components/StartupSanitizer";
import ErrorMonitoringBootstrap from "@/components/ErrorMonitoringBootstrap";

export const metadata = {
  title: "BadamSinghClasses | Learn Smart, Achieve Success",
  description: "Premium paid live classes platform"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="page-enter">
        <ErrorMonitoringBootstrap />
        <StartupSanitizer />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
