import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "H&S Performance Dashboard",
  description:
    "Health & Safety performance dashboard for the QTC Joint Venture · Qiddiya Tennis Centre.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-page font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
