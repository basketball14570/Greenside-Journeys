import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Greenside Edge — Golf Intelligence for Bettors & DFS",
  description:
    "The intelligence layer for serious golf bettors. Track every bet across every book, get live course-conditions alerts, and optimize DFS lineups — all in one place.",
  icons: {
    icon: "/brand/greenside-journeys-icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
