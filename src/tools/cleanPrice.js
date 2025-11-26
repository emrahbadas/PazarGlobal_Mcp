export default async function cleanPrice({ price_text }) {
  if (!price_text) return { clean_price: null };

  const cleaned = price_text
    .replace(/[^\d,]/g, "")
    .replace(",", "");

  const number = parseInt(cleaned, 10);

  return {
    clean_price: isNaN(number) ? null : number,
  };
}
