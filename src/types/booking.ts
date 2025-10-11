// ===== BASIC TYPES =====
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type PaymentMethod = "credit card" | "cash";
export type SpecialRequestType = "standard" | "special" | "additional";
export type BookingStep =
  | "basic_info"
  | "special_request"
  | "payment_method"
  | "confirmation";

// ===== CORE INTERFACES =====
export interface Booking {
  id: string;
  room_id: string;
  customer_id: string;
  check_in_date: string; // แก้ไขจาก check_in
  check_out_date: string; // แก้ไขจาก check_out
  total_amount: number; // แก้ไขจาก total
  status: BookingStatus;
  promo_code?: string;
  special_requests?: SpecialRequest[];
  additional_request?: string; // แก้ไขจาก additional_requests
  payment_method: PaymentMethod;
  booking_date?: string;
  created_at: string;
  updated_at: string;
}

// กำหนด interface สำหรับ meta
interface PaymentMeta {
  card_owner?: string;
  expiry_date?: string;
  [key: string]: unknown; // สำหรับ fields อื่นๆ
}

export interface Payment {
  id: string;
  booking_id: string;
  stripe_payment_id?: string;
  amount: number;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  card_last_four?: string;
  meta?: PaymentMeta; // ← ใช้ interface ที่กำหนด
  created_at: string;
  paid_at: string;
}

// ===== ROOM INFORMATION =====
export interface RoomInfo {
  id: string;
  room_type: string;
  price: number;
  promotion_price?: number;
  guests: number;
  room_size: number;
  bed_type: string;
  description: string;
  main_image_url: string[];
  gallery_images: string[];
  amenities: string[];
}

// ===== FORM DATA INTERFACES =====
export interface GuestInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  country: string;
}

export interface CreditCardDetails {
  cardNumber: string;
  cardOwner: string;
  expiryDate: string;
  cvc: string;
}

export interface BookingFormData {
  // Basic Info
  guestInfo: GuestInfo;

  // Room & Dates
  roomId: string;
  roomInfo?: Partial<RoomInfo>;
  checkIn: string;
  checkOut: string;
  guests: number;

  // Special Requests
  specialRequests: SpecialRequest[];
  additionalRequests?: string;

  // Payment
  paymentMethod: PaymentMethod;
  creditCardDetails?: CreditCardDetails;

  // Promotion
  promoCode?: string;
  promotionCode?: PromotionCode;

  // Calculation
  calculation?: BookingCalculation;

  // Timer
  timer?: BookingTimer;
}

// ===== SPECIAL REQUESTS =====
export interface SpecialRequest {
  id: string;
  type: SpecialRequestType;
  name: string;
  price?: number;
  selected: boolean;
  description?: string;
}

// ===== BOOKING SUMMARY =====
export interface BookingSummary {
  roomType: string;
  roomImage: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  basePrice: number;
  specialRequestsTotal: number;
  promoDiscount: number;
  total: number;
  currency: string;
}

// ===== BOOKING CALCULATION =====
export interface BookingCalculation {
  basePrice: number;
  nights: number;
  subtotal: number;
  specialRequestsTotal: number;
  promoDiscount: number;
  total: number;
  currency: string;
}

// ===== PROMOTION CODE =====
export interface PromotionCode {
  code: string;
  discount: number;
  discountType: "percentage" | "fixed";
  validFrom: string;
  validTo: string;
  applicableRooms: string[];
  isValid: boolean;
  errorMessage?: string;
  discount_amount?: number;  
  discount_percent?: number; 
  max_uses?: number;         
  used_count?: number;       
  is_active?: boolean;       
  description?: string; 
}

// ===== BOOKING POLICIES =====
export interface BookingPolicies {
  cancellation_hours: number;
  change_hours: number;
  refund_policy: string;
  change_policy: string;
  check_in_time: string;
  check_out_time: string;
}

// ===== TIMER =====
export interface BookingTimer {
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

// ===== ERROR HANDLING =====
export interface BookingError {
  field: string;
  message: string;
  code: string;
}

export interface BookingValidationResult {
  isValid: boolean;
  errors: BookingError[];
}

// ===== FORM VALIDATION =====
export interface FormValidation {
  field: string;
  isValid: boolean;
  message?: string;
}

// ===== BOOKING FLOW =====
export interface BookingFlowState {
  currentStep: BookingStep;
  completedSteps: BookingStep[];
  isValid: boolean;
  errors: BookingError[];
  timer?: BookingTimer;
}

// ===== BOOKING CONFIRMATION =====
export interface BookingConfirmation {
  bookingId: string;
  confirmationNumber: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  total: number;
  currency: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  guestName: string;
  email: string;
}

// ===== API RESPONSES =====
export interface BookingApiResponse {
  success: boolean;
  message: string;
  data?: Booking | Booking[];
  error?: string;
}

export interface PaymentApiResponse {
  success: boolean;
  message: string;
  data?: Payment | Payment[];
  error?: string;
}
