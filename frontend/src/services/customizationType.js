/* =====================================================
   Infer customization type from product type / category
   Mirrors backend setCustomizable.js keyword rules.
===================================================== */

const TYPE_RULES = [
  ["visiting card", "business-card"],
  ["business card", "business-card"],
  ["cards", "business-card"],
  ["hoodie", "hoodie"],
  ["polo", "tshirt"],
  ["t-shirt", "tshirt"],
  ["tshirt", "tshirt"],
  ["shirt", "tshirt"],
  ["notebook", "spiral-notebook"],
  ["diary", "spiral-notebook"],
  ["letterhead", "letterhead"],
  ["envelope", "envelope"],
  ["flyer", "flyer"],
  ["brochure", "brochure"],
  ["poster", "poster"],
  ["label", "sticker"],
  ["sticker", "sticker"],
  ["paper bag", "paper-bag"],
  ["tote bag", "tote-bag"],
  ["box", "box"],
  ["packaging", "box"],
  ["cap", "cap"],
  ["gift set", "giftset"],
  ["gift", "giftset"],
  ["bottle", "bottle"],
  ["mug", "mug"],
  ["pen", "pen"],
];

export const inferCustomizationType = (
  subcategory,
  category
) => {
  const sub = String(subcategory || "").toLowerCase();
  const cat = String(category || "").toLowerCase();

  const fromSub = TYPE_RULES.find(([key]) =>
    sub.includes(key)
  );
  if (fromSub) return fromSub[1];

  const fromCat = TYPE_RULES.find(([key]) =>
    cat.includes(key)
  );
  return fromCat ? fromCat[1] : "other";
};
