import React from "react";
import Head from "next/head";
import Navbar from "@/components/Navbar";
import { RegisterForm } from "@/components/customer/forms/RegisterForm";

const RegisterPage = () => {
  return (
    <>
      <Head>
        <title>Register - Neatly</title>
        <meta
          name="description"
          content="Register for Neatly to start using our services"
        />
      </Head>

      {/* Navbar */}
      <Navbar
        navItems={[
          { label: "About Neatly", path: "/" },
          { label: "Service & Facilities", path: "/" },
          { label: "Rooms & Suits", path: "/" },
        ]}
        loginLabel="Log in"
      />

      {/* Main Content with Background */}
      <div className="min-h-screen bg-center bg-no-repeat relative bg-bg md:bg-cover">
        {/* Overlay - Desktop only */}
        <div
          className="absolute inset-0 hidden md:block"
          style={{
            backgroundImage: "url('/Images/register-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        ></div>

        {/* Form Container */}
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-20">
          <div className="w-full max-w-sm md:max-w-4xl">
            <div className="bg-bg md:backdrop-blur-sm rounded-lg overflow-hidden">
              {/* Form Header */}
              <div className="px-4 pt-10 pb-6 md:px-20 md:pt-20">
                <h1 className="text-[44px] md:text-[68px] font-noto font-medium leading-[125%] tracking-[-2%] text-left text-green-800">
                  Register
                </h1>
              </div>

              {/* Form Content */}
              <div className="px-4 pb-10 md:px-20 md:pb-20">
                <RegisterForm />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;
