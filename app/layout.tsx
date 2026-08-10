import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { Providers } from "./providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://staticfm.vercel.app"),
  title: "staticfm — internet radio",
  description:
    "Internet radio for getting things done. Live stations from all over the world, with a curated instrumental Focus section for working.",
  openGraph: {
    title: "staticfm",
    description: "Internet radio for getting things done.",
    url: "https://staticfm.vercel.app",
    siteName: "staticfm",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "staticfm",
    description: "Internet radio for getting things done.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
