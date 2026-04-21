import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ML Sizer",
  description: "ML/GenAI deployment sizing tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full bg-[var(--bg-canvas)] text-[var(--text-primary)]">
        <ThemeProvider>
          <div className="flex h-full">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              <div className="px-8 py-8">
                <Breadcrumbs />
                {children}
              </div>
            </main>
          </div>
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
