/**
 * Calculate the number of nights between two dates
 * @param checkInDate - Check-in date string (ISO format or any valid date string)
 * @param checkOutDate - Check-out date string (ISO format or any valid date string)
 * @returns Number of nights between the two dates
 */
export const calculateNights = (
  checkInDate: string,
  checkOutDate: string
): number => {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const diffTime = checkOut.getTime() - checkIn.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Format a date string to a readable format
 * @param dateString - Date string to format
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted date string
 */
export const formatDate = (
  dateString: string,
  locale: string = "en-US"
): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Check if a date is valid
 * @param dateString - Date string to validate
 * @returns True if date is valid, false otherwise
 */
export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * Get date range info
 * @param checkInDate - Check-in date string
 * @param checkOutDate - Check-out date string
 * @returns Object containing nights count and formatted date strings
 */
export const getDateRangeInfo = (checkInDate: string, checkOutDate: string) => {
  const nights = calculateNights(checkInDate, checkOutDate);
  return {
    nights,
    checkIn: formatDate(checkInDate),
    checkOut: formatDate(checkOutDate),
    nightsText: `${nights} ${nights === 1 ? "night" : "nights"}`,
  };
};
