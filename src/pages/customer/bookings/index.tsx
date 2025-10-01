// import Layout from "@/components/Layout";
// import Footer from "@/components/Footer";

// export default function BookingHistoryPage() {
//     return (
//         <Layout>
//             <main className="max-w-[1440px] mx-auto">
//                 <div className="w-[473px] h-[85px] mt-[80px] ml-[162px] mr-[805px] mb-[69px]">
//                 <h1 className="font-noto text-[68px] text-green-700 leading-[125%] tracking-[-0.02em]">Booking History</h1>
//                 </div>
//                 <div>
//                 </div>
//             </main>
//         <Footer />
//         </Layout>

//     );
//   }


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
  },
  // เพิ่มรายการอื่น ๆ 
];

export default function BookingHistoryPage() {
  return (
    <Layout>
      <main className="max-w-[1120px] mx-auto px-4 md:px-6 py-10">
        <h1 className="text-[40px] md:text-[56px] font-medium text-green-800 tracking-[-0.02em] mb-6">
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
