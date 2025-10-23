import Image from "next/image";

const Footer = () => {
  return (
    <footer
      className="w-full bg-green-800 text-white"
      style={{ margin: "0 auto" }}
    >
      <div
        className="
          flex flex-col md:flex-row
          justify-between
          items-start
          mx-auto
          px-6 md:px-12
          pt-12
          pb-8
          gap-10 md:gap-0
        "
      >
        {/* Left: Logo & Description */}
        <div className="flex flex-col items-start md:w-1/2 w-full">
          <div className="flex items-center mb-6">
            <Image
              src="/logo-white.png"
              alt="Neatly Logo"
              width={120}
              height={32}
              className="object-contain"
              priority
            />
          </div>
          <div className="mb-2 font-semibold text-base">Neatly Hotel</div>
          <div className="text-xs text-gray-200">
            The best hotel for living your experience
          </div>
        </div>

        {/* Right: Contact Info */}
        <div className="w-full flex flex-col items-end justify-start">
          {/* CONTACT Header */}

          <div className="space-y-6 w-full md:w-auto md:min-w-[320px]">
            <p className="text-inter font-bold">CONTACT</p>
            <div className="flex items-center gap-3 text-base text-[#ffffff] justify-start">
              <span className="inline-block text-[#ffffff]">
                <Image
                  src="/icons/phone.png"
                  alt="Phone"
                  width={24}
                  height={24}
                  className="h-5 w-5"
                />
              </span>
              <span className="font-normal text-[#ffffff] text-left">
                +66 99 999 9999
              </span>
            </div>
            <div className="flex items-center gap-3 text-base text-[#ffffff] justify-start">
              <span className="inline-block text-[#ffffff]">
                <Image
                  src="/icons/email.png"
                  alt="Mail"
                  width={24}
                  height={24}
                  className="w-5 h-5"
                />
              </span>
              <span className="font-normal text-[#ffffff] text-left">
                contact@neatlyhotel.com
              </span>
            </div>
            <div className="flex items-start gap-3 text-base text-[#ffffff] justify-start">
              <span className="inline-block pt-0.5 text-[#ffffff]">
                <Image
                  src="/icons/location.png"
                  alt="Location"
                  className="w-5 h-5"
                  width={24}
                  height={24}
                />
              </span>
              <span className="font-normal text-[#ffffff] leading-snug text-left">
                188 Phaya Thai Rd, Thung Phaya Thai,
                <br />
                Ratchathewi, Bangkok 10400
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Divider */}
      <div className="border-t border-[#465C50] w-full max-w-[1440px] mx-auto my-6" />
      {/* Social & Copyright */}
      <div className="flex flex-row md:flex-row justify-between items-center max-w-[1440px] mx-auto px-6 md:px-12 pb-6 w-full">
        {/* On mobile: social + copyright in a row, icon left; On md+: keep original */}
        <div className="flex flex-row items-center justify-between w-full md:w-auto">
          <div className="flex items-center space-x-4">
            {/* Social icons */}
            <a
              href="https://www.facebook.com/"
              aria-label="Facebook"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/icons/facebook.png"
                alt="Facebook"
                width={18}
                height={18}
                style={{ minWidth: 18, minHeight: 18 }}
              />
            </a>
            <a
              href="https://www.instagram.com/"
              aria-label="Instagram"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/icons/instagram.png"
                alt="Instagram"
                width={18}
                height={18}
                style={{ minWidth: 18, minHeight: 18 }}
              />
            </a>
            <a
              href="https://x.com/"
              aria-label="Twitter"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/icons/twitter.png"
                alt="Twitter"
                width={18}
                height={18}
                style={{ minWidth: 18, minHeight: 18 }}
              />
            </a>
          </div>
          <div className="text-xm text-gray-400 ml-4 md:hidden whitespace-nowrap">
            Copyright © 2022 Neatly Hotel
          </div>
        </div>
        <div className="text-xm text-gray-400 hidden md:block">
          Copyright © 2022 Neatly Hotel
        </div>
      </div>
    </footer>
  );
};

export default Footer;
