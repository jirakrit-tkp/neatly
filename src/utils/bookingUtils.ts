// ===== BOOKING UTILITY FUNCTIONS =====
import { SpecialRequest, BookingCalculation } from "@/types/booking";

// ===== CALCULATION FUNCTIONS =====
export const calculateBookingTotal = (
  basePrice: number,
  nights: number,
  specialRequests: SpecialRequest[],
  roomCount: number = 1,
  promoDiscount: number = 0
): BookingCalculation => {
  // ราคาห้อง = (price หรือ promotion_price) * จำนวนห้อง * จำนวนคืน
  const subtotal = basePrice * roomCount * nights;

  // คำนวณ special requests ตามแนวทางใหม่ และเพิ่ม calculated_price
  const specialRequestsWithCalculatedPrice = specialRequests.map((req) => {
    if (!req.selected || !req.price) {
      return req;
    }

    const isBreakfast = req.name.toLowerCase().includes("breakfast");
    let calculatedPrice: number;

    if (isBreakfast) {
      // Breakfast: ราคา * จำนวนห้อง * จำนวนคืน
      calculatedPrice = (req.price || 0) * roomCount * nights;
    } else {
      // อื่นๆ (Baby cot, Extra bed, Extra pillows, Phone chargers, Airport transfer): ราคา * จำนวนห้อง
      calculatedPrice = (req.price || 0) * roomCount;
    }

    return {
      ...req,
      calculated_price: calculatedPrice,
    };
  });

  const specialRequestsTotal = specialRequestsWithCalculatedPrice
    .filter((req) => req.selected && req.calculated_price)
    .reduce((sum, req) => sum + (req.calculated_price || 0), 0);

  // ตรวจสอบไม่ให้ total ติดลบ
  const total = Math.max(0, subtotal + specialRequestsTotal - promoDiscount);

  return {
    basePrice,
    nights,
    subtotal,
    specialRequestsTotal,
    promoDiscount,
    total,
    currency: "THB",
  };
};

export const calculateNights = (checkIn: string, checkOut: string): number => {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

export const isBookingExpired = (
  createdAt: string,
  expiryMinutes: number = 5
): boolean => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - created.getTime()) / (1000 * 60);
  return diffMinutes > expiryMinutes;
};

// ===== FORMATTING FUNCTIONS =====
export const formatCurrency = (
  amount: number,
  currency: string = "THB"
): string => {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    currencyDisplay: "code",
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// เพิ่ม function ใหม่สำหรับแสดงราคาแบบไม่มีหน่วยเงิน
export const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
  }).format(amount);
};
