import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { PublicConfigProvider } from "@/components/public-config-provider";

export const metadata: Metadata = {
  title: "ImageVault",
  description: "Organisation image uploads, quotas, and payments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <PublicConfigProvider>
            <ServiceWorkerRegistration />
            {children}
          </PublicConfigProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
