import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SMS Movies — Discover and rate movies",
  description:
    "Discover movies and series, explore your favorite genres, and rate your favorites in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
