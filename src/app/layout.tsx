import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hubit Tech & Gadget Store",
  description:
    "You set the rules. Your agent does the shopping. Checkout is not a permission it can be talked into: the tool is absent from its toolbox until you approve.",
  openGraph: {
    title: "Hubit",
    description:
      "You set the rules. Your agent does the shopping. It cannot check out until you approve.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
