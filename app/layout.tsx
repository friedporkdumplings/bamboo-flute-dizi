import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bamboo — Visual Dizi Tutor",
  description: "Learn bamboo flute fingering visually, one note at a time.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
