import type { TimeSlot, WaterAvailability } from '../lib/types';
import { TIME_SLOT_LABELS } from '../lib/types';

const DEFAULT_LIMITED: WaterAvailability = {
  type: 'limited',
  daysPerWeek: 7,
  timesPerDay: 1,
  hoursPerSession: 2,
  timeSlots: ['morning'],
};

export default function WaterAvailabilityPicker({
  value,
  onChange,
}: {
  value: WaterAvailability;
  onChange: (w: WaterAvailability) => void;
}) {
  function toggleSlot(slot: TimeSlot) {
    const has = value.timeSlots.includes(slot);
    onChange({ ...value, timeSlots: has ? value.timeSlots.filter(s => s !== slot) : [...value.timeSlots, slot] });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange({ type: '24hours', daysPerWeek: 7, timesPerDay: 1, hoursPerSession: 24, timeSlots: [] })}
          className={`border rounded-lg px-3 py-2 text-sm ${value.type === '24hours' ? 'border-success bg-emerald-50 text-emerald-700 font-medium' : 'border-gray-300'}`}
        >
          २४ घण्टा उपलब्ध
        </button>
        <button
          type="button"
          onClick={() => onChange(value.type === 'limited' ? value : DEFAULT_LIMITED)}
          className={`border rounded-lg px-3 py-2 text-sm ${value.type === 'limited' ? 'border-primary bg-blue-50 text-primary font-medium' : 'border-gray-300'}`}
        >
          सीमित समयमा मात्र
        </button>
      </div>

      {value.type === 'limited' && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label text-xs">हप्तामा कति दिन</label>
              <select
                className="input"
                value={value.daysPerWeek}
                onChange={e => onChange({ ...value, daysPerWeek: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n} दिन</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">दिनमा कति पटक</label>
              <select
                className="input"
                value={value.timesPerDay}
                onChange={e => onChange({ ...value, timesPerDay: Number(e.target.value) })}
              >
                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} पटक</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">प्रत्येक पटक कति घण्टा</label>
              <select
                className="input"
                value={value.hoursPerSession}
                onChange={e => onChange({ ...value, hoursPerSession: Number(e.target.value) })}
              >
                {[0.5, 1, 1.5, 2, 3, 4, 6, 8].map(n => <option key={n} value={n}>{n} घण्टा</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label text-xs">समय (छान्नुहोस्)</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(TIME_SLOT_LABELS) as TimeSlot[]).map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => toggleSlot(slot)}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${value.timeSlots.includes(slot) ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300'}`}
                >
                  {TIME_SLOT_LABELS[slot]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
