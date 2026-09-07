import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const archivo = Archivo({
  variable: "--font-archivo",
  weight: ["600", "700", "800"],
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-deva",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["devanagari"],
});

export const metadata: Metadata = {
  title: "OceanScan AI // Hydrographic Debris Classifier",
  description:
    "Side-scan sonar debris detection and geotagged cleanup dispatches.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexMono.variable} ${notoDevanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="app-shell flex min-h-screen flex-col">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
