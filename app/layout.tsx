import type { Metadata, Viewport } from "next";
// next/font scarica i font al build e li serve dal nostro dominio: nessuna richiesta a Google dai visitatori
import { Geist, Geist_Mono, Hanken_Grotesk, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Font dei form pubblici (components/valuation/*), usati tramite le variabili CSS
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Valutazione immobiliare · Sud Milano",
  description: "Scopri in due passaggi il valore stimato del tuo immobile nei comuni a sud di Milano.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0B0C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${hanken.variable} ${jetbrains.variable} ${newsreader.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
