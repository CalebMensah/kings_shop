export const BUSINESS = {
  name: "Kings Shop and Importation",
  shortName: "Kings",
  tagline: "Shop & Importation",
  description:
    "Kings Shop and Importation is a Cape Coast-based shop and importation business. We bring quality products from international suppliers to Ghana, and take your orders so we can source them for you.",
  phone: "0598785053",
  phones: ["0598785053", "0503168438"],
  whatsapp: "0598785053",
  email: "email@yourdomain.com",
  instagram: "",
  tiktok: "",
  location: "Master Sam, opposite Ankokeen Trading Enterprise, Cape Coast",
  categories: [
    "Fashion & Apparel",
    "Electronics & Gadgets",
    "Home, Kitchen & Living",
    "Beauty & Personal Care",
    "Kids & Baby",
    "Health & Fitness",
    "Auto & Industrial",
    "Lifestyle & More",
  ],
};

export const POLICIES = {
  preorder:
    "Preorder items are purchased specifically according to customers' orders. Once an order has been confirmed and the purchasing process has commenced, cancellations may not be accepted.",
  orderConfirmation:
    "Customers are responsible for confirming their orders before payment. Once an order has been processed for sourcing, cancellation may not be possible.",
  refund: `All orders placed with ${BUSINESS.name} are considered final once the order has been confirmed and payment has been made. Customers cannot request a refund simply because they have changed their mind, no longer need the item, or no longer wish to wait for their order. However, refunds may be issued if the item arrives faulty/damaged, or if the item is confirmed unavailable or lost during the importation process. Customers may be required to provide clear photos or videos of faulty/damaged items when making a claim. Minor differences in colour, size, appearance, or packaging due to supplier specifications may not qualify for a refund.`,
} as const;

export const SHIPPING_INFO = {
  disclaimer:
    "Prices shown do not include shipping fees. Shipping is confirmed once your order has been sourced, and we'll share the cost and delivery updates with you directly.",
  shortNote: "Price excludes shipping",
  method: "",
  timeline: "",
  whatsappGroupUrl: "" as string,
};
