const products = [
  {
    id: 1,
    name: "Premium Business Cards",
    category: "Visiting Cards",
    price: 299,
    oldPrice: 499,
    discount: "40% OFF",
    rating: 4.8,
    reviews: 128,
    badge: "PREMIUM",

    description:
      "Make a lasting impression with premium quality business cards printed on high-quality paper.",

    images: [
      "https://images.pexels.com/photos/6373839/pexels-photo-6373839.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.unsplash.com/photo-1636247498719-a8a04ed961a4?auto=format&fit=crop&w=800&q=80",
      "https://images.pexels.com/photos/8490062/pexels-photo-8490062.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],

    paperTypes: ["Matte", "Glossy", "Textured"],
    sizes: ["Standard (3.5 × 2)", "Square (2.5 × 2.5)"],

    features: [
      "350 GSM Premium Paper",
      "Matte Finish",
      "Full Color Printing",
      "Double Side Printing",
      "High Resolution",
      "Custom Design Support"
    ]
  },

  {
    id: 2,
    name: "Luxury Matte Cards",
    category: "Visiting Cards",
    price: 449,
    oldPrice: 699,
    discount: "36% OFF",
    rating: 4.9,
    reviews: 96,
    badge: "BEST SELLER",

    description:
      "Elegant luxury visiting cards designed for businesses that want a premium professional identity.",

    images: [
      "https://images.pexels.com/photos/8489951/pexels-photo-8489951.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.unsplash.com/photo-1718670013921-2f144aba173a?auto=format&fit=crop&w=800&q=80",
      "https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],

    paperTypes: ["Matte", "Luxury", "Textured"],
    sizes: ["Standard", "Square"],

    features: [
      "400 GSM Premium Paper",
      "Luxury Matte Finish",
      "Sharp Printing",
      "Premium Color Quality",
      "Double Side Printing",
      "Professional Design Support"
    ]
  },

  {
    id: 3,
    name: "Elegant Black Business Cards",
    category: "Visiting Cards",
    price: 399,
    oldPrice: 599,
    discount: "33% OFF",
    rating: 4.7,
    reviews: 74,
    badge: "NEW",

    description:
      "Bold black business cards with a sophisticated finish for premium brands and professionals.",

    images: [
      "https://images.pexels.com/photos/8947550/pexels-photo-8947550.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/8842917/pexels-photo-8842917.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/8347499/pexels-photo-8347499.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],

    paperTypes: ["Matte", "Glossy"],
    sizes: ["Standard", "Rounded Corner"],

    features: [
      "Premium Black Paper",
      "Luxury Finish",
      "High Resolution Printing",
      "Water Resistant",
      "Double Side Printing",
      "Custom Branding"
    ]
  },

  {
    id: 4,
    name: "Corporate Business Cards",
    category: "Visiting Cards",
    price: 249,
    oldPrice: 399,
    discount: "38% OFF",
    rating: 4.6,
    reviews: 52,
    badge: "POPULAR",

    description:
      "Clean and professional corporate visiting cards for offices, companies and startups.",

    images: [
      "https://images.unsplash.com/photo-1707299651093-1c1448a7d993?auto=format&fit=crop&w=800&q=80",
      "https://images.pexels.com/photos/5632397/pexels-photo-5632397.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/5632398/pexels-photo-5632398.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],

    paperTypes: ["Matte", "Glossy"],
    sizes: ["Standard"],

    features: [
      "300 GSM Paper",
      "Professional Finish",
      "Full Color Printing",
      "Fast Delivery",
      "High Quality Print",
      "Custom Design"
    ]
  },

  {
    id: 5,
    name: "Textured Finish Cards",
    category: "Visiting Cards",
    price: 499,
    oldPrice: 799,
    discount: "37% OFF",
    rating: 4.8,
    reviews: 88,
    badge: "PREMIUM",

    description:
      "Premium textured visiting cards with a unique tactile finish.",

    images: [
      "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/4038653/pexels-photo-4038653.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],

    paperTypes: ["Textured", "Matte"],
    sizes: ["Standard", "Square"],

    features: [
      "350 GSM Textured Paper",
      "Premium Feel",
      "Sharp Print",
      "Luxury Finish",
      "Double Side Printing",
      "Design Assistance"
    ]
  },

  {
    id: 6,
    name: "Rounded Corner Cards",
    category: "Visiting Cards",
    price: 349,
    oldPrice: 549,
    discount: "36% OFF",
    rating: 4.7,
    reviews: 69,
    badge: "NEW",

    description:
      "Modern rounded-corner business cards for a clean and contemporary brand identity.",

    images: [
      "https://images.pexels.com/photos/5417837/pexels-photo-5417837.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/7014342/pexels-photo-7014342.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/5493950/pexels-photo-5493950.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],

    paperTypes: ["Matte", "Glossy"],
    sizes: ["Rounded Corner"],

    features: [
      "350 GSM Paper",
      "Rounded Corners",
      "Premium Printing",
      "Smooth Finish",
      "High Quality Colors",
      "Custom Design"
    ]
  },

  {
    id: 7,
    name: "Ultra Premium Cards",
    category: "Visiting Cards",
    price: 599,
    oldPrice: 999,
    discount: "40% OFF",
    rating: 4.9,
    reviews: 112,
    badge: "BEST SELLER",

    description:
      "Our most premium business card collection designed for luxury brands.",

    images: [
      "https://images.pexels.com/photos/4467735/pexels-photo-4467735.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/1925536/pexels-photo-1925536.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/3771097/pexels-photo-3771097.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],

    paperTypes: ["Luxury", "Textured", "Matte"],
    sizes: ["Standard", "Square"],

    features: [
      "450 GSM Luxury Paper",
      "Premium Finish",
      "Foil Printing",
      "Embossed Options",
      "Double Side Printing",
      "Free Design Support"
    ]
  },

  {
    id: 8,
    name: "Minimal Design Cards",
    category: "Visiting Cards",
    price: 199,
    oldPrice: 299,
    discount: "33% OFF",
    rating: 4.5,
    reviews: 43,
    badge: "POPULAR",

    description:
      "Minimal and elegant business cards for modern professionals and startups.",

    images: [
      "https://images.unsplash.com/photo-1636247498719-a8a04ed961a4?auto=format&fit=crop&w=800&q=80",
      "https://images.pexels.com/photos/5632397/pexels-photo-5632397.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/6373839/pexels-photo-6373839.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],

    paperTypes: ["Matte", "Glossy"],
    sizes: ["Standard"],

    features: [
      "300 GSM Paper",
      "Minimal Finish",
      "Full Color Printing",
      "Fast Production",
      "Professional Quality",
      "Easy Customization"
    ]
  },

  // ===== Stationery & Office =====

  {
    id: 9,
    name: "Premium Letterheads",
    category: "Stationery & Office",
    price: 199,
    oldPrice: 349,
    discount: "43% OFF",
    rating: 4.6,
    reviews: 45,
    badge: "POPULAR",
    description: "Professional letterheads printed on premium paper for your business correspondence.",
    images: [
      "https://images.pexels.com/photos/5632397/pexels-photo-5632397.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/5632398/pexels-photo-5632398.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: ["Bond Paper", "Executive"],
    sizes: ["A4", "Letter"],
    features: ["100 GSM Bond Paper", "Full Color", "Custom Header", "Watermark Option"]
  },

  {
    id: 10,
    name: "Spiral Notebooks",
    category: "Stationery & Office",
    price: 149,
    oldPrice: 249,
    discount: "40% OFF",
    rating: 4.5,
    reviews: 32,
    badge: "NEW",
    description: "Custom branded spiral notebooks perfect for corporate gifting and office use.",
    images: [
      "https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/1420901/pexels-photo-1420901.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/733856/pexels-photo-733856.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: ["Ruled", "Plain", "Grid"],
    sizes: ["A5", "A4"],
    features: ["80 GSM Paper", "120 Pages", "Custom Cover", "Spiral Binding"]
  },

  {
    id: 11,
    name: "Business Envelopes",
    category: "Stationery & Office",
    price: 99,
    oldPrice: 179,
    discount: "45% OFF",
    rating: 4.4,
    reviews: 28,
    badge: "",
    description: "Professional printed envelopes matching your brand identity.",
    images: [
      "https://images.pexels.com/photos/4226770/pexels-photo-4226770.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/4226896/pexels-photo-4226896.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/4226874/pexels-photo-4226874.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: ["White", "Kraft"],
    sizes: ["DL", "C5", "C4"],
    features: ["100 GSM Paper", "Full Color Print", "Self-Seal", "Window Option"]
  },

  // ===== Marketing Materials =====

  {
    id: 12,
    name: "Promotional Flyers",
    category: "Marketing Materials",
    price: 249,
    oldPrice: 449,
    discount: "44% OFF",
    rating: 4.7,
    reviews: 67,
    badge: "BEST SELLER",
    description: "Eye-catching flyers printed on high-quality paper for marketing campaigns.",
    images: [
      "https://images.pexels.com/photos/6373839/pexels-photo-6373839.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/5417837/pexels-photo-5417837.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/7014342/pexels-photo-7014342.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: ["Glossy", "Matte"],
    sizes: ["A4", "A5", "DL"],
    features: ["170 GSM Art Paper", "Full Color", "Double Side", "UV Coating Option"]
  },

  {
    id: 13,
    name: "Corporate Brochures",
    category: "Marketing Materials",
    price: 399,
    oldPrice: 699,
    discount: "43% OFF",
    rating: 4.8,
    reviews: 54,
    badge: "PREMIUM",
    description: "Professional tri-fold and bi-fold brochures for your business.",
    images: [
      "https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/4038653/pexels-photo-4038653.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/5493950/pexels-photo-5493950.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: ["Glossy", "Matte", "Silk"],
    sizes: ["A4 Tri-fold", "A4 Bi-fold"],
    features: ["200 GSM Art Paper", "Full Color", "Fold Options", "Lamination Available"]
  },

  {
    id: 14,
    name: "Event Posters",
    category: "Marketing Materials",
    price: 179,
    oldPrice: 299,
    discount: "40% OFF",
    rating: 4.5,
    reviews: 38,
    badge: "NEW",
    description: "Large format posters for events, promotions and advertising.",
    images: [
      "https://images.pexels.com/photos/3771097/pexels-photo-3771097.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/1925536/pexels-photo-1925536.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/4467735/pexels-photo-4467735.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: ["Glossy", "Matte"],
    sizes: ["A3", "A2", "A1"],
    features: ["150 GSM Paper", "Vibrant Colors", "Weather Resistant", "Custom Sizes"]
  },

  // ===== Stickers & Labels =====

  {
    id: 15,
    name: "Product Labels",
    category: "Stickers & Labels",
    price: 149,
    oldPrice: 279,
    discount: "47% OFF",
    rating: 4.6,
    reviews: 82,
    badge: "POPULAR",
    description: "Custom printed product labels for branding and packaging.",
    images: [
      "https://images.pexels.com/photos/8347499/pexels-photo-8347499.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/8842917/pexels-photo-8842917.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: ["Glossy", "Matte", "Transparent"],
    sizes: ["Small (2x2)", "Medium (3x3)", "Large (4x4)"],
    features: ["Waterproof", "Strong Adhesive", "Full Color", "Die-Cut Available"]
  },

  {
    id: 16,
    name: "Vinyl Stickers",
    category: "Stickers & Labels",
    price: 199,
    oldPrice: 349,
    discount: "43% OFF",
    rating: 4.7,
    reviews: 95,
    badge: "BEST SELLER",
    description: "Durable vinyl stickers for indoor and outdoor use.",
    images: [
      "https://images.pexels.com/photos/8489951/pexels-photo-8489951.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/8490062/pexels-photo-8490062.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/8947550/pexels-photo-8947550.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: ["Vinyl Glossy", "Vinyl Matte"],
    sizes: ["Custom Size", "Sheet (A4)"],
    features: ["Weatherproof", "UV Resistant", "Custom Shape", "Premium Vinyl"]
  },

  // ===== Packaging =====

  {
    id: 17,
    name: "Custom Paper Bags",
    category: "Packaging",
    price: 299,
    oldPrice: 499,
    discount: "40% OFF",
    rating: 4.6,
    reviews: 56,
    badge: "POPULAR",
    description: "Eco-friendly custom printed paper bags for retail and gifting.",
    images: [
      "https://images.pexels.com/photos/5632397/pexels-photo-5632397.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/5632398/pexels-photo-5632398.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/4038653/pexels-photo-4038653.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: ["Kraft", "White Card"],
    sizes: ["Small", "Medium", "Large"],
    features: ["200 GSM Card", "Custom Print", "Rope Handle", "Eco-Friendly"]
  },

  {
    id: 18,
    name: "Product Boxes",
    category: "Packaging",
    price: 399,
    oldPrice: 649,
    discount: "39% OFF",
    rating: 4.8,
    reviews: 41,
    badge: "PREMIUM",
    description: "Custom printed packaging boxes for products and gifts.",
    images: [
      "https://images.pexels.com/photos/4226770/pexels-photo-4226770.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/4226896/pexels-photo-4226896.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/4226874/pexels-photo-4226874.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: ["Corrugated", "Card Board"],
    sizes: ["Small", "Medium", "Large", "Custom"],
    features: ["Full Color Print", "Custom Design", "Strong Material", "Food Safe Option"]
  },

  // ===== Clothing & Bags =====

  {
    id: 19,
    name: "Custom Printed T-Shirts",
    category: "Clothing & Bags",
    price: 349,
    oldPrice: 599,
    discount: "42% OFF",
    rating: 4.7,
    reviews: 112,
    badge: "BEST SELLER",
    description: "High-quality custom printed t-shirts for teams, events and branding.",
    images: [
      "https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/1420901/pexels-photo-1420901.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/733856/pexels-photo-733856.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: [],
    sizes: ["S", "M", "L", "XL", "XXL"],
    features: ["100% Cotton", "DTG Printing", "Custom Design", "Bulk Discount"]
  },

  {
    id: 20,
    name: "Branded Tote Bags",
    category: "Clothing & Bags",
    price: 199,
    oldPrice: 349,
    discount: "43% OFF",
    rating: 4.5,
    reviews: 67,
    badge: "NEW",
    description: "Eco-friendly custom printed tote bags for corporate and retail.",
    images: [
      "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/5632397/pexels-photo-5632397.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: [],
    sizes: ["Standard", "Large"],
    features: ["Canvas Material", "Full Color Print", "Reusable", "Eco-Friendly"]
  },

  {
    id: 21,
    name: "Embroidered Caps",
    category: "Clothing & Bags",
    price: 249,
    oldPrice: 399,
    discount: "38% OFF",
    rating: 4.4,
    reviews: 34,
    badge: "",
    description: "Custom embroidered caps for teams, events and corporate branding.",
    images: [
      "https://images.pexels.com/photos/5493950/pexels-photo-5493950.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/5417837/pexels-photo-5417837.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/7014342/pexels-photo-7014342.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: [],
    sizes: ["Free Size", "Adjustable"],
    features: ["Cotton Twill", "Embroidered Logo", "Adjustable Strap", "Multiple Colors"]
  },

  // ===== Mugs & Gifts =====

  {
    id: 22,
    name: "Custom Coffee Mugs",
    category: "Mugs & Gifts",
    price: 249,
    oldPrice: 449,
    discount: "44% OFF",
    rating: 4.8,
    reviews: 156,
    badge: "BEST SELLER",
    description: "Personalized coffee mugs with custom photo or design printing.",
    images: [
      "https://images.pexels.com/photos/1187317/pexels-photo-1187317.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/1793035/pexels-photo-1793035.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: [],
    sizes: ["11 oz", "15 oz"],
    features: ["Ceramic Material", "Dishwasher Safe", "Full Wrap Print", "Gift Box Available"]
  },

  {
    id: 23,
    name: "Photo Mugs",
    category: "Mugs & Gifts",
    price: 299,
    oldPrice: 499,
    discount: "40% OFF",
    rating: 4.7,
    reviews: 89,
    badge: "POPULAR",
    description: "Upload your favorite photo and get it printed on a premium ceramic mug.",
    images: [
      "https://images.pexels.com/photos/1793035/pexels-photo-1793035.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/1187317/pexels-photo-1187317.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: [],
    sizes: ["11 oz", "15 oz", "Magic Mug"],
    features: ["High Resolution Print", "Fade Resistant", "Microwave Safe", "Custom Box"]
  },

  {
    id: 24,
    name: "Corporate Gift Sets",
    category: "Mugs & Gifts",
    price: 599,
    oldPrice: 999,
    discount: "40% OFF",
    rating: 4.9,
    reviews: 45,
    badge: "PREMIUM",
    description: "Premium corporate gift sets with custom branding for clients and employees.",
    images: [
      "https://images.pexels.com/photos/3771097/pexels-photo-3771097.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/1925536/pexels-photo-1925536.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/4467735/pexels-photo-4467735.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: [],
    sizes: ["Standard Set", "Premium Set"],
    features: ["Custom Branding", "Premium Box", "Multiple Items", "Bulk Available"]
  },

  // ===== Pens & Drinkware =====

  {
    id: 25,
    name: "Branded Ball Pens",
    category: "Pens & Drinkware",
    price: 49,
    oldPrice: 89,
    discount: "45% OFF",
    rating: 4.3,
    reviews: 210,
    badge: "POPULAR",
    description: "Custom printed ball pens for corporate gifting and promotional events.",
    images: [
      "https://images.pexels.com/photos/4226770/pexels-photo-4226770.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/4226896/pexels-photo-4226896.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/4226874/pexels-photo-4226874.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: [],
    sizes: ["Standard"],
    features: ["Smooth Writing", "Custom Print", "Blue/Black Ink", "Bulk Pricing"]
  },

  {
    id: 26,
    name: "Premium Metal Pens",
    category: "Pens & Drinkware",
    price: 199,
    oldPrice: 349,
    discount: "43% OFF",
    rating: 4.7,
    reviews: 78,
    badge: "PREMIUM",
    description: "Elegant metal pens with custom engraving for executive gifting.",
    images: [
      "https://images.pexels.com/photos/5632397/pexels-photo-5632397.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/5632398/pexels-photo-5632398.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: [],
    sizes: ["Standard", "Slim"],
    features: ["Metal Body", "Laser Engraving", "Gift Box", "Refillable"]
  },

  {
    id: 27,
    name: "Custom Water Bottles",
    category: "Pens & Drinkware",
    price: 349,
    oldPrice: 599,
    discount: "42% OFF",
    rating: 4.6,
    reviews: 56,
    badge: "NEW",
    description: "Stainless steel water bottles with custom branding for corporate use.",
    images: [
      "https://images.pexels.com/photos/1187317/pexels-photo-1187317.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/1793035/pexels-photo-1793035.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: [],
    sizes: ["500 ml", "750 ml", "1 Litre"],
    features: ["Stainless Steel", "Double Wall", "Custom Print", "Leak Proof"]
  },

  // ===== Custom Polo T-Shirts =====

  {
    id: 28,
    name: "Corporate Polo Shirts",
    category: "Custom Polo T-Shirts",
    price: 449,
    oldPrice: 749,
    discount: "40% OFF",
    rating: 4.8,
    reviews: 134,
    badge: "BEST SELLER",
    description: "Premium polo shirts with custom embroidery for corporate teams.",
    images: [
      "https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/1420901/pexels-photo-1420901.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/733856/pexels-photo-733856.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: [],
    sizes: ["S", "M", "L", "XL", "XXL"],
    features: ["Cotton Pique", "Embroidered Logo", "Collar Tipping", "Multiple Colors"]
  },

  {
    id: 29,
    name: "Printed Polo T-Shirts",
    category: "Custom Polo T-Shirts",
    price: 399,
    oldPrice: 649,
    discount: "39% OFF",
    rating: 4.6,
    reviews: 87,
    badge: "NEW",
    description: "Full color printed polo t-shirts for events and team wear.",
    images: [
      "https://images.pexels.com/photos/5493950/pexels-photo-5493950.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/5417837/pexels-photo-5417837.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/7014342/pexels-photo-7014342.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: [],
    sizes: ["S", "M", "L", "XL", "XXL"],
    features: ["Poly-Cotton Blend", "Sublimation Print", "Breathable Fabric", "Custom Design"]
  },

  {
    id: 30,
    name: "Event Custom T-Shirts",
    category: "Custom Polo T-Shirts",
    price: 299,
    oldPrice: 499,
    discount: "40% OFF",
    rating: 4.5,
    reviews: 198,
    badge: "POPULAR",
    description: "Affordable custom t-shirts for events, college fests and marathons.",
    images: [
      "https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/5632397/pexels-photo-5632397.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/4038653/pexels-photo-4038653.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    paperTypes: [],
    sizes: ["S", "M", "L", "XL", "XXL", "3XL"],
    features: ["Round Neck", "Screen Print", "180 GSM Cotton", "Bulk Discount"]
  }
];

/* =========================================================
   CUSTOMIZATION CONFIG
   Sirf ye products customization editor mein khulte hain.
   Admin panel se bhi enable/type change ho sakta hai.
========================================================= */

const customizationMap = {
  1: "business-card",
  2: "business-card",
  3: "business-card",
  4: "business-card",
  5: "business-card",
  6: "business-card",
  7: "business-card",
  8: "business-card",
  9: "letterhead",
  10: "spiral-notebook",
  11: "envelope",
  12: "flyer",
  13: "brochure",
  14: "poster",
  15: "sticker",
  16: "sticker",
  17: "paper-bag",
  18: "box",
  19: "tshirt",
  20: "tote-bag",
  21: "cap",
  22: "mug",
  23: "mug",
  24: "giftset",
  25: "pen",
  26: "pen",
  27: "bottle",
  28: "tshirt",
  29: "tshirt",
  30: "tshirt",
};

products.forEach((p) => {
  const type = customizationMap[p.id];
  if (type) {
    p.customizable = true;
    p.customizationType = type;
  }
});

/* =========================================================
   PRODUCT MOCKUP IMAGES
   Har product ka apna real vector mockup — /public/products
   front = listing/detail main view, back = gallery alt view
========================================================= */

products.forEach((p) => {
  p.images = [
    `/products/${p.id}-front.svg`,
    `/products/${p.id}-back.svg`,
  ];
});

export default products;
