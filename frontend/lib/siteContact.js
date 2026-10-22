const email = String(process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "").trim();
const whatsapp = String(process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/\D/g, "");
const address = String(process.env.NEXT_PUBLIC_SUPPORT_ADDRESS || "").trim();
const officeHours = String(process.env.NEXT_PUBLIC_SUPPORT_HOURS || "").trim();
const mapsUrl = String(process.env.NEXT_PUBLIC_SUPPORT_MAPS_URL || "").trim();

export const siteContact = {
  email,
  whatsapp,
  whatsappDisplay: whatsapp ? `+${whatsapp}` : "",
  address,
  officeHours,
  mapsUrl
};
