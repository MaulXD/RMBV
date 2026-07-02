import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionProvider } from "@/components/SessionProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialog";
import "./globals.css";
import { CapacitorPushRegister } from "@/components/CapacitorPushRegister";
import { NotificationPrompt } from "@/components/NotificationPrompt";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "SCS System",
  description: "SCS System — gestão de clientes com equipes, teses, documentação e relatórios",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "SCS",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('gestao-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.add(theme);
    document.documentElement.style.colorScheme = theme;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans`} style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)", paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}>
        <ThemeProvider>
          <SessionProvider>
            <ToastProvider>
              <ConfirmDialogProvider>
                {children}
                <CapacitorPushRegister />
                <NotificationPrompt />
              </ConfirmDialogProvider>
            </ToastProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
