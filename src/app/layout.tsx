import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StudySessionProvider } from "@/contexts/StudySessionContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { AIGenerationProvider } from "@/contexts/AIGenerationContext";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudyBuddy",
  description: "A local studying application for dynamic question loading",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <SettingsProvider>
            <StudySessionProvider>
              <AIGenerationProvider>
                <div className="min-h-screen flex flex-col">
                  <main className="flex-grow">
                    <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
                      {children}
                    </div>
                  </main>
                </div>
              </AIGenerationProvider>
            </StudySessionProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
