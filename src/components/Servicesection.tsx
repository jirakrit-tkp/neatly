import Image from "next/image";

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
      <h2
        className="
    font-noto
    text-white
    text-[44px] md:text-[70px]
    leading-[46px] md:leading-[60px]
    mt-4 md:mt-0
    mb-12 md:mb-16
    text-center
  "
      >
        Service &amp; <br className="block md:hidden" />
        Facilities
      </h2>

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
        {services.map((service) => (
          <div
            key={service.label}
            className="flex flex-col items-center w-1/3 md:w-auto mb-2 mx-2"
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
          </div>
        ))}
      </div>
    </section>
  );
};

export default Servicesection;
