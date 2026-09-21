import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Movie Gather — Your next great watch",
  description:
    "Discover movies and series, explore your favorite genres, and gather your next great watches in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
