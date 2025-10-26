import "@/styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { HotelInfoProvider } from "@/context/HotelInfoContext";
import type { AppProps } from "next/app";
import Script from "next/script";
import { useEffect } from "react";
import { useRouter } from "next/router";
import * as gtag from "../lib/gtag";
import Chatbot from "@/components/Chatbot";

import { Noto_Serif_Display } from "next/font/google";

// 2. Configure the font object
const noto = Noto_Serif_Display({
  // Always include subsets
  subsets: ["latin"],
  // Use 'variable' to assign a CSS variable name
  variable: "--font-noto",
  // You can specify weights and styles here if needed
  // weights: [ '400', '700' ],
  display: "swap", // Recommended to prevent layout shift
});
export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      gtag.pageview(url);
    };
    router.events.on("routeChangeComplete", handleRouteChange);
    return () => router.events.off("routeChangeComplete", handleRouteChange);
  }, [router.events]);

  // Check if current route should hide chatbot
  const isAdminPage = router.pathname.startsWith('/admin');
  const isAuthPage = router.pathname === '/customer/login' || router.pathname === '/customer/register';
  const shouldHideChatbot = isAdminPage || isAuthPage;

  return (
    <>
      {/* GA Script */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', { send_page_view: false });
        `}
      </Script>
      <AuthProvider>
        <HotelInfoProvider>
          <Component {...pageProps} />
          
          {/* Show Chatbot on all pages except admin, login, and register */}
          {!shouldHideChatbot && <Chatbot />}
        </HotelInfoProvider>
      </AuthProvider>
    </>
  );
}
