import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/oswald";
import "@fontsource/rye";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Unholy Reaper MC",
    template: "%s · Unholy Reaper MC",
  },
  description: "Internes Verwaltungstool des Unholy Reaper MC (fiktive Roleplay-Daten).",
  icons: { icon: "/logo.png", apple: "/logo.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
