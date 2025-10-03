import Layout from "@/components/Layout";
import Footer from "@/components/Footer";
import BookingCard, { type Booking } from "@/components/bookings/BookingCard";

const data: Booking[] = [
  {
    id: "bk_1001",
    roomName: "Superior Garden View",
    imageUrl: "/images/sample-room-1.png",
    checkInDate: "Wed, 1 Oct 2025",
    checkInNote: "After 2:00 PM",
    checkOutDate: "Thu, 2 Oct 2025",
    checkOutNote: "Before 12:00 PM",
    bookedAtText: "Tue, 30 Sep 2025",
    guests: 2,
    nights: 1,
    payment: { status: "success", method: "Credit Card", mask: "*888" },
    items: [
      { label: "Superior Garden View Room", amount: 2500.0 },
      { label: "Airport transfer", amount: 200.0 },
      { label: "Promotion Code", amount: -400.0 },
    ],
    currency: "THB",
    total: 2300.0,
    additionalRequest: "Can i have some chocolate?",
  },
  {
    id: "bk_1002",
    roomName: "Deluxe",
    imageUrl: "/images/sample-room-2.png",
    checkInDate: "Thu, 2 Oct 2025",
    checkInNote: "After 2:00 PM",
    checkOutDate: "Fri, 3 Oct 2025",
    checkOutNote: "Before 12:00 PM",
    bookedAtText: "Tue, 16 Oct 2022",
    guests: 2,
    nights: 1,
    payment: { status: "success", method: "Credit Card", mask: "*123" },
    items: [
      { label: "Deluxe Room", amount: 3200.0 },
      { label: "Breakfast", amount: 300.0 },
      { label: "Promo", amount: -500.0 },
    ],
    currency: "THB",
    total: 3000.0,
    additionalRequest: "Late check-out if possible.",
  },
  {
    id: "bk_1003",
    roomName: "Premier Sea View",
    imageUrl: "/images/sample-room-3.png",
    checkInDate: "Fri, 4 Oct 2025",
    checkInNote: "After 2:00 PM",
    checkOutDate: "Sat, 5 Oct 2025",
    checkOutNote: "Before 12:00 PM",
    bookedAtText: "Tue, 16 Oct 2022",
    guests: 3,
    nights: 2,
    payment: { status: "success", method: "Bank Transfer" },
    items: [
      { label: "Premier Sea View", amount: 4200.0 },
      { label: "Extra bed", amount: 600.0 },
    ],
    currency: "THB",
    total: 4800.0,
  },
];

export default function BookingHistoryPage() {
  return (
    <Layout>
      <main className="max-w-[1120px] mx-auto  md:px-6 pb-5 pt-[80px] sm:pt-[96px] md:pt-12">
        <h1 className="text-[44px] md:text-[68px] px-5 font-noto font-medium text-green-700 leading-[125%] tracking-[-0.02em] mb-6">
          Booking History
        </h1>

        <div className="space-y-8">
          {data.map((item) => (
            <BookingCard key={item.id} booking={item} />
          ))}
        </div>
      </main>
      <Footer />
    </Layout>
  );
}