import type { AppProps } from "next/app";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Herosection from "@/components/Herosection";
import Aboutsection from "@/components/Aboutsection";
import Servicesection from "@/components/Servicesection";
import Roomwrapper from "@/components/Roomwrapper";
import Testimonial from "@/components/Testimonial";

import * as gtag from "../lib/gtag";
import { useEffect } from "react";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    gtag.pageview("/", "Home Page");
  }, []);

  return (
    <div className="pt-12 md:pt-[100px] overflow-x-hidden">
      <Navbar />
      <Herosection />
      <Aboutsection />
      <Servicesection />
      <Roomwrapper />
      <Testimonial />
      <Footer />
    </div>
  );
}