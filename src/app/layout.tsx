import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StudySessionProvider } from "@/contexts/StudySessionContext";
import { SettingsProvider } from "@/contexts/SettingsContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudyBuddy Deluxe",
  description: "A local studying application for dynamic question loading",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SettingsProvider>
          <StudySessionProvider>
            <div className="min-h-screen flex flex-col">
              <header className="bg-blue-600 text-white py-4 px-6 shadow-md">
                <div className="container mx-auto">
                  <h1 className="text-2xl font-bold">StudyBuddy Deluxe</h1>
                </div>
              </header>
              <main className="flex-grow container mx-auto px-4 py-8">
                {children}
              </main>
            </div>
          </StudySessionProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
