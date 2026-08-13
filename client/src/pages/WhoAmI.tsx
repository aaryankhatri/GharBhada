import { Link } from 'react-router-dom';

export default function WhoAmI() {
  return (
    <div className="max-w-lg mx-auto mt-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">तपाईं को हुनुहुन्छ?</h1>
        <p className="text-gray-500 mt-1">लगइन गर्नु अघि छान्नुहोस्</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          to="/login?role=tenant"
          className="card card-hover p-6 text-center block border-2 border-transparent hover:border-primary"
        >
          <p className="text-4xl">🔑</p>
          <h2 className="font-semibold mt-3">भाडामा बस्ने</h2>
          <p className="text-sm text-gray-500 mt-1">Tenant — कोठा खोज्ने र बुक गर्ने</p>
        </Link>
        <Link
          to="/login?role=landlord"
          className="card card-hover p-6 text-center block border-2 border-transparent hover:border-primary"
        >
          <p className="text-4xl">🏠</p>
          <h2 className="font-semibold mt-3">घरबेटी</h2>
          <p className="text-sm text-gray-500 mt-1">Landlord — property लिस्ट गर्ने</p>
        </Link>
      </div>

      <p className="text-center text-sm text-gray-500 mt-6">
        Admin हुनुहुन्छ? <Link to="/login" className="text-primary underline">सिधै लगइन गर्नुहोस्</Link>
      </p>
    </div>
  );
}
