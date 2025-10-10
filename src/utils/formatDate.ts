// utils/formatDate.ts

export function formatDate(dateString: string): string {
  if (!dateString) return "";

  return new Date(dateString)
    .toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/,/g, "");
}
