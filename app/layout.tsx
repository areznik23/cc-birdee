import type { Metadata } from "next";
import "./globals.css";
import 'antd/dist/reset.css';
import { AntdThemeProvider } from "@/lib/theme/antd-theme";

export const metadata: Metadata = {
  title: "Claude Code Analyzer",
  description: "Transform Claude Code session logs into actionable insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AntdThemeProvider>
          {children}
        </AntdThemeProvider>
      </body>
    </html>
  );
}