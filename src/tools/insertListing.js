import fetch from "node-fetch";

export default async function insertListing(args) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/listings`;

  const payload = {
    product_name: args.product_name,
    brand: args.brand,
    condition: args.condition,
    category: args.category,
    description: args.description,
    original_price_text: args.original_price_text,
    clean_price: args.clean_price,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  return {
    success: res.ok,
    status: res.status,
    result: await res.json()
  };
}
