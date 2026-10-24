const fs = require("fs");
const p =
  "C:\\Users\\acer\\Downloads\\My Projects\\PRINT EXPERT_ZIPFINAL\\printexpert\\printexpert\\frontend\\src\\pages\\Customizer.jsx";
const src = fs.readFileSync(p, "utf8");

const start = src.indexOf("  const placeOrder = async () => {");
const end = src.indexOf("  const saveDesign = () => {");

if (start < 0 || end < 0 || end < start) {
  console.error("markers not found", start, end);
  process.exit(1);
}

const newFn = `  const placeOrder = async () => {
    if (isPlacingOrder) {
      return;
    }

    setIsPlacingOrder(true);

    /* Place Order = put the customized product in the
       cart and go to Checkout — order is created ONLY
       by Checkout's confirmed submission (stock, price,
       auth all validated server-side there) */
    const customProduct =
      createCustomProduct();

    try {
      const result =
        await contextAddToCart({
          productId:
            customProduct.originalProductId ||
            customProduct.id,
          product_id:
            customProduct.originalProductId ||
            customProduct.id,
          originalProductId:
            customProduct.originalProductId,
          name: customProduct.name,
          image: customProduct.image,
          price: customProduct.price,
          quantity:
            customProduct.quantity || 1,
          size: customProduct.size,
          paperType: customProduct.paperType,
          itemType: "custom",
          customization: {
            designs: customProduct.designs,
            text: customProduct.text,
            color: customProduct.color,
            personName: customProduct.personName,
            designation:
              customProduct.designation,
            companyName:
              customProduct.companyName,
            customerDescription:
              customProduct.customerDescription,
            customerNote:
              customProduct.customerNote,
          },
          designs: customProduct.designs,
          text: customProduct.text,
          color: customProduct.color,
          personName: customProduct.personName,
          designation:
            customProduct.designation,
          companyName: customProduct.companyName,
        });

      if (result?.error) {
        alert(result.error);
        setIsPlacingOrder(false);
        return;
      }
    } catch (error) {
      console.error(
        "Cart save error:",
        error
      );
      alert(
        "Checkout ke liye product add nahi ho paya."
      );
      setIsPlacingOrder(false);
      return;
    }

    navigate("/checkout");
  };

`;

fs.writeFileSync(p, src.slice(0, start) + newFn + src.slice(end), "utf8");
console.log("replaced", start, "→", end);
