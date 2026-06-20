import type { Metadata } from "next";
import "../src/index.css";

export const metadata: Metadata = {
  title: "AI-PI — Безплатен гласов скрининг за риск от Паркинсон",
  description:
    "Обадете се на безплатна телефонна линия и за минута проверете гласовите си биомаркери за ранен риск от Паркинсон. Това е предварителен скрининг, а не медицинска диагноза.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bg">
      <head>
        {/*
         * Mark that JS is active before first paint, so the scroll-reveal
         * starting state (hidden) only applies when JS can reveal it again.
         * Without JS the `.js` class is never added and content stays visible.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
