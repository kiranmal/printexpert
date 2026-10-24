const orders = [
  {
    id: "ORD10001",
    date: "15 Aug 2026",
    total: 1299,
    payment: "Cash on Delivery",

    items: [
      {
        id: 1,
        name: "Premium Cotton T-Shirt",
        price: 799,
        quantity: 1,
        image:
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500",
      },
      {
        id: 2,
        name: "Classic Cap",
        price: 500,
        quantity: 1,
        image:
          "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=500",
      },
    ],

    status: "Shipped",

    tracking: {
      ordered: true,
      processing: true,
      shipped: true,
      outForDelivery: false,
      delivered: false,
    },

    deliveryDate: "20 Aug 2026",
  },

  {
    id: "ORD10002",
    date: "10 Aug 2026",
    total: 899,

    payment: "Online Payment",

    items: [
      {
        id: 3,
        name: "Premium Hoodie",
        price: 899,
        quantity: 1,
        image:
          "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500",
      },
    ],

    status: "Delivered",

    tracking: {
      ordered: true,
      processing: true,
      shipped: true,
      outForDelivery: true,
      delivered: true,
    },

    deliveryDate: "15 Aug 2026",
  },
];

export default orders;