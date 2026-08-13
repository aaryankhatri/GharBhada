import { Link } from 'react-router-dom';
import type { Property } from '../lib/types';
import { AMENITY_LABELS } from '../lib/types';
import { photoUrl } from '../lib/api';

export default function PropertyCard({ p }: { p: Property }) {
  const activeAmenities = (Object.keys(AMENITY_LABELS) as (keyof typeof AMENITY_LABELS)[])
    .filter(k => p.amenities[k])
    .slice(0, 4);

  return (
    <Link to={`/properties/${p.id}`} className="card card-hover overflow-hidden block">
      <div className="aspect-[4/3] bg-gray-200 overflow-hidden relative">
        {p.photos[0] && (
          <img src={photoUrl(p.photos[0].url)} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
        )}
        <span className="absolute top-2 right-2 bg-brand-gradient text-white text-sm font-bold rounded-full px-3 py-1 shadow">
          रु {p.monthlyRent.toLocaleString('en-IN')}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug">{p.title}</h3>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">वडा {p.wardNumber}, {p.tole}</p>
        <span className={`inline-block mt-1.5 text-xs rounded-full px-2 py-0.5 ${p.waterAvailability.type === '24hours' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          💧 {p.waterAvailability.type === '24hours' ? '२४ घण्टा पानी' : 'सीमित पानी'}
        </span>
        <div className="mt-2 flex flex-wrap gap-1">
          {activeAmenities.map(k => (
            <span key={k} className="text-xs bg-blue-50 text-primary rounded-full px-2 py-0.5">
              {AMENITY_LABELS[k]}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
