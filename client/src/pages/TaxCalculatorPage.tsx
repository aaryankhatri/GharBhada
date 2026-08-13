import TaxCalculator from '../components/TaxCalculator';

export default function TaxCalculatorPage() {
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">घरबहाल कर क्याल्कुलेटर</h1>
      <TaxCalculator />
      <div className="card p-5 text-sm text-gray-600 space-y-2">
        <h3 className="font-semibold text-gray-800">घरबहाल कर बारे</h3>
        <p>काठमाडौं महानगरपालिका (KMC) मा घरबहाल आयमा १०% कर लाग्छ। यो कर बुझाउनु घरबेटीको दायित्व हो।</p>
        <p>रु २०,००० वा बढी मासिक भाडा भएमा Muluki Civil Code 2074 (धारा ३८६) अनुसार लिखित बहाल सम्झौता अनिवार्य हुन्छ।</p>
        <p>रु २०,००० भन्दा कम भाडामा लिखित सम्झौता अनिवार्य छैन, तर विवादमा प्रमाणका रूपमा उपयोगी हुन्छ।</p>
      </div>
    </div>
  );
}
