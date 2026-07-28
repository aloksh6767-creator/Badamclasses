import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import StartupSanitizer from "@/components/StartupSanitizer";
import ErrorMonitoringBootstrap from "@/components/ErrorMonitoringBootstrap";
import PwaBootstrap from "@/components/PwaBootstrap";

const productionUrl = "https://www.badamclasses.in";
const seoTitle = "Badam Classes | Online Courses, Live Classes & Mock Tests";
const seoDescription = "Badam Classes provides online courses, live classes, mock tests, PDF notes and exam preparation resources for competitive examinations.";

export const metadata = {
  metadataBase: new URL(productionUrl),
  title: {
    default: seoTitle,
    template: "%s | Badam Classes"
  },
  description: seoDescription,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Badam Classes",
    title: seoTitle,
    description: seoDescription,
    images: [{ url: "/new-logo.png", type: "image/png" }]
  },
  twitter: {
    card: "summary_large_image",
    title: seoTitle,
    description: seoDescription,
    images: ["/new-logo.png"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true
    }
  },
  manifest: "/manifest.webmanifest",
  applicationName: "Badam Classes",
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
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Badam Classes",
      url: productionUrl
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Badam Classes",
      url: productionUrl,
      logo: `${productionUrl}/new-logo.png`
    }
  ];

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="page-enter">
        <ErrorMonitoringBootstrap />
        <PwaBootstrap />
        <StartupSanitizer />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
