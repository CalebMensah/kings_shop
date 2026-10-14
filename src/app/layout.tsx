import type { Metadata } from "next";
import { Montserrat, Manrope } from "next/font/google";
import "./globals.css";
import { BUSINESS } from "@/lib/constants";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-montserrat",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: `${BUSINESS.name} | ${BUSINESS.tagline}`,
  description: BUSINESS.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} ${manrope.variable} font-body bg-canvas text-navy-900`}>
        {children}
      </body>
    </html>
  );
}
