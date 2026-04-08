/**
 * Centralized WhatsApp URL utilities.
 * Uses api.whatsapp.com which works better across environments.
 */

export const getWhatsAppUrl = (phone: string, message: string): string => {
  const cleanPhone = phone.replace(/\D/g, "");
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
};

/**
 * Attempts to open WhatsApp. Returns the URL if blocked (for fallback UI).
 */
export const tryOpenWhatsApp = (phone: string, message: string): string | null => {
  const url = getWhatsAppUrl(phone, message);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    return url; // blocked, return URL for fallback
  }
  return null; // opened successfully
};
