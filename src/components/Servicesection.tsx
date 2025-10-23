import Image from "next/image";
import { motion, Variants } from "framer-motion";

const services = [
  {
    icon: "/icons/spa.png",
    label: "Spa",
  },
  {
    icon: "/icons/sauna.png",
    label: "Sauna",
  },
  {
    icon: "/icons/fitness.png",
    label: "Fitness",
  },
  {
    icon: "/icons/lounge.png",
    label: "Arrival Lounge",
  },
  {
    icon: "/icons/freewifi.png",
    label: "Free WiFi",
  },
  {
    icon: "/icons/parking.png",
    label: "Parking",
  },
  {
    icon: "/icons/24 hours.png",
    label: "24 hours operation",
  },
];

const Servicesection = () => {
  // Animation variant for the title
  const titleVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 50,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  // Animation variant for service icons with stagger
  const iconVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 40,
    },
    visible: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1],
        delay: 0.2 + index * 0.1, // Stagger each icon by 0.1s
      },
    }),
  };

  return (
    <section
      id="services"
      className="
        w-full
        bg-green-700
        flex flex-col
        items-center
        justify-center
         md:py-0
        min-h-[600px] md:min-h-[380px]
        "
      style={{
        height: "480px",
        margin: "0 auto",
        position: "relative",
      }}
    >
      {/* Title */}
      <motion.h2
        className="
    font-noto
    text-white
    text-[44px] md:text-[70px]
    leading-[46px] md:leading-[60px]
    mt-4 md:mt-0
    mb-12 md:mb-16
    text-center
  "
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={titleVariants}
      >
        Service &amp; <br className="block md:hidden" />
        Facilities
      </motion.h2>
      {/* Services Icons */}
      <div
        className="
          w-full
          flex flex-wrap md:flex-row
          justify-center
          gap-y-8 md:gap-y-10
          gap-x-4 md:gap-x-16
          px-4 md:px-0
        "
        style={{
          maxWidth: "1100px",
        }}
      >
        {services.map((service, index) => (
          <motion.div
            key={service.label}
            className="flex flex-col items-center w-1/3 md:w-auto mb-2 mx-2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            custom={index}
            variants={iconVariants}
          >
            <div className="mb-2 md:mb-3">
              {/* 
                Mobile: 40x40 
                Desktop (md+): 48x48 
              */}
              <div className="block md:hidden">
                <Image
                  src={service.icon}
                  alt={service.label}
                  width={20}
                  height={20}
                  className="object-contain h-12 w-12"
                  priority
                />
              </div>
              <div className="hidden md:block">
                <Image
                  src={service.icon}
                  alt={service.label}
                  width={60}
                  height={60}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <span className="text-white text-xs md:text-sm text-center font-normal leading-tight">
              {service.label}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Servicesection;
