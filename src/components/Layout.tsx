import Navbar from "@/components/Navbar";
import Footer from "./Footer";
import { Toaster } from "sonner";

export type LayoutProps = {
  children?: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Toaster
        position="top-right"
        richColors
        expand={true}
        toastOptions={{
          style: {
            zIndex: 9999,
          },
        }}
      />
      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}
