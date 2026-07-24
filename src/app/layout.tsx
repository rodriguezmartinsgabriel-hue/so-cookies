import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Só Cookies",
  description: "Gestão completa do seu negócio de cookies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="h-full font-ui">{children}</body>
    </html>
  );
}
