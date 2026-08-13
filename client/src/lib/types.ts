export type Role = 'tenant' | 'landlord' | 'admin';

export interface User {
  id: number;
  email: string;
  phone: string;
  role: Role;
  fullName: string;
  address: string;
  citizenshipNumber?: string | null;
  panNumber?: string | null;
  occupation?: string | null;
  organization?: string | null;
  isVerified: boolean;
}

export interface Amenities {
  wifi: boolean;
  parking: boolean;
  attachedBathroom: boolean;
  commonBathroom: boolean;
  kitchenAccess: boolean;
  laundry: boolean;
  security: boolean;
  elevator: boolean;
}

export interface Photo {
  url: string;
  label: string;
}

export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night';

export interface WaterAvailability {
  type: '24hours' | 'limited';
  daysPerWeek: number;
  timesPerDay: number;
  hoursPerSession: number;
  timeSlots: TimeSlot[];
}

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: 'बिहान',
  afternoon: 'दिउँसो',
  evening: 'साँझ',
  night: 'राति',
};

export function formatWaterAvailability(w: WaterAvailability): string {
  if (w.type === '24hours') return '२४ घण्टा उपलब्ध';
  const parts = [
    w.daysPerWeek >= 7 ? 'हरेक दिन' : `हप्तामा ${w.daysPerWeek} दिन`,
    `दिनमा ${w.timesPerDay} पटक`,
    `प्रत्येक पटक ${w.hoursPerSession} घण्टा`,
  ];
  if (w.timeSlots.length) parts.push(w.timeSlots.map(s => TIME_SLOT_LABELS[s]).join(', '));
  return parts.join(' — ');
}

export interface Property {
  id: number;
  landlordId: number;
  title: string;
  wardNumber: number;
  tole: string;
  municipality: string;
  district: string;
  monthlyRent: number;
  advanceAmount: number;
  rentDueDay: number;
  availableFrom: string;
  description?: string | null;
  amenities: Amenities;
  waterAvailability: WaterAvailability;
  photos: Photo[];
  isVerified: boolean;
  isAvailable: boolean;
  googleMapsPin?: string | null;
  landlord?: { id: number; fullName: string; phone?: string };
  createdAt: string;
}

export interface CoTenant {
  name: string;
  citizenshipNo: string;
  phone: string;
  relationship: string;
}

export interface Booking {
  id: number;
  tenantId: number;
  propertyId: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  tenantName: string;
  tenantPhone: string;
  tenantOccupation: string;
  tenantOrganization?: string | null;
  coTenants: CoTenant[];
  moveInDate: string;
  advanceAmount: number;
  createdAt: string;
  property?: Property;
}

export interface VisitRequest {
  id: number;
  tenantId: number;
  propertyId: number;
  message?: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  property?: Property;
  tenant?: { id: number; fullName: string; phone: string; email: string };
}

export const AMENITY_LABELS: Record<keyof Amenities, string> = {
  wifi: 'WiFi',
  parking: 'पार्किङ',
  attachedBathroom: 'Attached बाथरूम',
  commonBathroom: 'साझा बाथरूम',
  kitchenAccess: 'भान्सा प्रयोग',
  laundry: 'लुगा धुने ठाउँ',
  security: 'सुरक्षा',
  elevator: 'लिफ्ट',
};
