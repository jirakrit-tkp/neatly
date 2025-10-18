import Head from "next/head";
import UpdatePasswordForm from "@/components/update-password/UpdatePasswordForm";
import Layout from "@/components/Layout";
import Image from "next/image";

export default function CustomerLoginPage() {
  return (
    <>
      <Head>
        <title>Log In — Neatly</title>
      </Head>

      <Layout>
        <main>
          <div className="bg-bg max-w-[1440px] mx-auto flex flex-col md:flex-row">
            {/* ซ้าย: รูป */}
            <div className="w-full md:w-[708px] h-[240px] sm:h-[269px] md:h-[924px]">
              <Image
                width={800}
                height={600}
                src="/Images/login-bg.png"
                alt="Resort pool"
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>

            {/* ขวา: ฟอร์ม */}
            <div className="w-full md:w-[732px] md:h-[924px] px-4 py-8 md:px-0 md:pt-[150px] md:pb-[309px] md:pl-[120px] md:pr-[160px]">
              <div className="w-full md:w-[452px] md:h-[465px] flex flex-col">
                <div className="w-full md:w-[460px] md:h-[87px] mb-6 md:mb-[60px]">
                  <h1 className="mb-4 md:mb-8 font-noto text-[40px] md:text-[68px] leading-[120%] md:leading-[125%] font-medium tracking-[-0.02em] text-green-800">
                    Update Password
                  </h1>
                </div>

                <div className="w-full md:w-[452px]">
                  <UpdatePasswordForm />
                </div>
              </div>
            </div>
          </div>
        </main>
      </Layout>
    </>
  );
}