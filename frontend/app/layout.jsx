import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import StartupSanitizer from "@/components/StartupSanitizer";
import ErrorMonitoringBootstrap from "@/components/ErrorMonitoringBootstrap";
import PwaBootstrap from "@/components/PwaBootstrap";

export const metadata = {
  title: "BadamSinghClasses | Learn Smart, Achieve Success",
  description: "Premium paid live classes platform",
  manifest: "/manifest.webmanifest",
  applicationName: "BadamSinghClasses",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BadamClasses"
  },
  icons: {
    icon: [
      { url: "/new-logo.png", type: "image/png" }
    ],
    apple: [{ url: "/new-logo.png", type: "image/png" }]
  }
};

export const viewport = {
  themeColor: "#071126",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="page-enter">
        <ErrorMonitoringBootstrap />
        <PwaBootstrap />
        <StartupSanitizer />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
