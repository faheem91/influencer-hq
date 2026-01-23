import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Force dynamic rendering to avoid Clerk SSG issues with missing publishableKey at build time
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Influencer HQ - Social Media Tracking",
  description: "Manage brands, track social media mentions, and automate creator discovery",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
