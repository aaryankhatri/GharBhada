import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

async function main() {
  const hash = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@gharbhada.com' },
    update: {},
    create: {
      email: 'admin@gharbhada.com', phone: '9800000001', passwordHash: hash,
      role: 'admin', fullName: 'GharBhada Admin', address: 'काठमाडौं', isVerified: true,
    },
  });

  const landlord = await prisma.user.upsert({
    where: { email: 'landlord@test.com' },
    update: {},
    create: {
      email: 'landlord@test.com', phone: '9841000001', passwordHash: hash,
      role: 'landlord', fullName: 'राम बहादुर श्रेष्ठ', address: 'बागबजार, काठमाडौं-२८',
      citizenshipNumber: '27-01-75-01234', isVerified: true,
    },
  });

  const tenant = await prisma.user.upsert({
    where: { email: 'tenant@test.com' },
    update: {},
    create: {
      email: 'tenant@test.com', phone: '9861000001', passwordHash: hash,
      role: 'tenant', fullName: 'सीता कुमारी तामाङ', address: 'धादिङ, नीलकण्ठ-४',
      citizenshipNumber: '30-01-76-04321', occupation: 'student',
      organization: 'त्रिभुवन विश्वविद्यालय', isVerified: true,
    },
  });

  const sampleProps = [
    {
      title: 'घाम लाग्ने एकल कोठा — बागबजार', wardNumber: 28, tole: 'बागबजार',
      monthlyRent: 8000, advanceAmount: 16000, rentDueDay: 5,
      description: 'कोठा south-facing छ, morning sunlight आउँछ। College नजिकै, quiet area।',
      amenities: { wifi: true, parking: false, attachedBathroom: false, commonBathroom: true, kitchenAccess: true, laundry: false, security: true, elevator: false },
    },
    {
      title: '2BHK फ्ल्याट — नयाँ बानेश्वर', wardNumber: 10, tole: 'नयाँ बानेश्वर',
      monthlyRent: 25000, advanceAmount: 50000, rentDueDay: 3,
      description: 'नयाँ भवन, attached bathroom, parking सुविधा सहित। Office area नजिक।',
      amenities: { wifi: true, parking: true, attachedBathroom: true, commonBathroom: false, kitchenAccess: true, laundry: true, security: true, elevator: true },
    },
    {
      title: 'विद्यार्थीका लागि कोठा — कीर्तिपुर', wardNumber: 32, tole: 'कीर्तिपुर, TU गेट',
      monthlyRent: 6000, advanceAmount: 6000, rentDueDay: 5,
      description: 'TU campus नजिक, विद्यार्थीका लागि उपयुक्त। पानी/बिजुली राम्रो सुविधा।',
      amenities: { wifi: true, parking: false, attachedBathroom: false, commonBathroom: true, kitchenAccess: true, laundry: false, security: false, elevator: false },
    },
    {
      title: '1BHK — कालिमाटी, तरकारी बजार नजिक', wardNumber: 13, tole: 'कालिमाटी',
      monthlyRent: 15000, advanceAmount: 30000, rentDueDay: 1,
      description: 'बजार नजिक, यातायात सुविधा राम्रो। सानो परिवारका लागि उपयुक्त।',
      amenities: { wifi: false, parking: true, attachedBathroom: true, commonBathroom: false, kitchenAccess: true, laundry: false, security: true, elevator: false },
    },
  ];

  for (let i = 0; i < sampleProps.length; i++) {
    const p = sampleProps[i];
    const photos = [
      { url: `/uploads/seed-room-${i + 1}.png`, label: 'कोठा' },
      { url: `/uploads/seed-bath-${i + 1}.png`, label: 'बाथरूम' },
      { url: `/uploads/seed-building-${i + 1}.png`, label: 'भवन/प्रवेशद्वार' },
    ];
    await prisma.property.create({
      data: {
        landlordId: landlord.id,
        title: p.title, wardNumber: p.wardNumber, tole: p.tole,
        monthlyRent: p.monthlyRent, advanceAmount: p.advanceAmount, rentDueDay: p.rentDueDay,
        availableFrom: new Date(), description: p.description,
        amenities: JSON.stringify(p.amenities), photos: JSON.stringify(photos),
        waterAvailability: JSON.stringify({ type: '24hours', daysPerWeek: 7, timesPerDay: 1, hoursPerSession: 24, timeSlots: [] }),
        isVerified: true, isAvailable: true,
      },
    });
  }

  console.log('Seed सम्पन्न:', { admin: admin.email, landlord: landlord.email, tenant: tenant.email, properties: sampleProps.length });
  console.log('सबै test accounts को password: password123');
}

main().finally(() => prisma.$disconnect());
