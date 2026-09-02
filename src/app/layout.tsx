import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Self-hosted at build time, so the demo never waits on a font CDN over venue wifi.
const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://hubit-store.vercel.app"),
  title: "Hubit, desk and gear",
  description:
    "A shop an agent can actually use. You set the rules, your agent does the browsing, and checkout is not a permission it can talk its way into: the tool is absent from its toolbox until you approve the basket.",
  openGraph: {
    title: "Hubit, desk and gear",
    description:
      "You set the rules. Your agent does the shopping. It cannot check out until you approve the basket.",
    type: "website",
    // Drop a 1200x630 file at /public/og.png. See images-manifest.md.
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
