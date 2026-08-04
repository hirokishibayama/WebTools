import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { AdSenseScript } from "@/components/ads/AdSenseScript";
import { Analytics } from "@/components/analytics/Analytics";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "@/styles/globals.css";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}｜無料のオンライン便利ツール集`,
    template: `%s｜${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${notoSansJp.variable} flex min-h-screen flex-col font-sans antialiased`}>
        <AdSenseScript />
        <Analytics />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
