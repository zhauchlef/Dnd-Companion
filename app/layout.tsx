import type { Metadata } from "next";
import MainLayout from "./components/MainLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dungeon Companion",
  description: "Your ultimate D&D campaign companion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#211c17]">
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}