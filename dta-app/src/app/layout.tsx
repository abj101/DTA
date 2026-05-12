import type { Metadata } from "next";
import { Geist_Mono, Inter, Libre_Baskerville } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteNavbar } from "@/components/layout/site-navbar";
import { ScrollbarVisibility } from "@/components/layout/scrollbar-visibility";
import { CalendlyScript } from "@/components/CalendlyScript";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const libreBaskerville = Libre_Baskerville({
  weight: "400",
  style: "italic",
  subsets: ["latin"],
  variable: "--font-libre-baskerville",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Dublin Tutoring Association",
    template: "%s · Dublin Tutoring Association",
  },
  description:
    "Private tutoring and college prep for families in Dublin, Pleasanton, and the Tri-Valley. Book a free consultation with credentialed peer tutors.",
  openGraph: {
    title: "Dublin Tutoring Association · Private Tutoring & College Prep",
    description:
      "Personalized tutoring for grades 6–12. Meet recent graduates who know AP coursework and admissions firsthand.",
    siteName: "Dublin Tutoring Association",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dublin Tutoring Association",
    description:
      "Private tutoring and college prep for Tri-Valley families. Book a free consultation.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} ${libreBaskerville.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://assets.calendly.com/assets/external/widget.css"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col bg-background">
        <CalendlyScript />
        <ScrollbarVisibility />
        <SiteNavbar />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
