// KMC House Rent Tax — १०%
export function calculateHouseRentTax(monthlyRent: number) {
  const annualRent = monthlyRent * 12;
  const taxRate = 0.1; // 10% (KMC)
  const annualTax = Math.round(annualRent * taxRate);
  return {
    monthlyRent,
    annualRent,
    taxRate,
    annualTax,
    message: `तपाईंको मासिक भाडा रु ${monthlyRent.toLocaleString('en-IN')} भए, वार्षिक कर रु ${annualTax.toLocaleString('en-IN')} हुन्छ।`,
  };
}
