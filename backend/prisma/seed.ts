import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const rupees = (n: number) => n * 100;

const treatments = [
  { slug: "general-consultation", name: "General Consultation", durationMin: 30, priceMin: 500, priceMax: 800, bookingPrice: 500, description: "A routine check-up and oral health advice." },
  { slug: "teeth-cleaning", name: "Teeth Cleaning (Scaling and Polishing)", durationMin: 45, priceMin: 1500, priceMax: 3000, bookingPrice: 1500, description: "Removes plaque and tartar for cleaner, healthier teeth." },
  { slug: "teeth-whitening", name: "Teeth Whitening", durationMin: 60, priceMin: 6000, priceMax: 15000, bookingPrice: 4000, description: "Brightens your smile by removing stains and discoloration." },
  { slug: "root-canal", name: "Root Canal Treatment", durationMin: 90, priceMin: 6000, priceMax: 12000, bookingPrice: 2000, description: "Saves damaged or infected teeth and relieves pain." },
  { slug: "dental-implants", name: "Dental Implants", durationMin: 90, priceMin: 25000, priceMax: 40000, bookingPrice: 5000, description: "A long-lasting solution to replace missing teeth." },
  { slug: "veneers", name: "Veneers", durationMin: 60, priceMin: 12000, priceMax: 25000, bookingPrice: 3000, description: "Natural-looking shells that improve shape and color." },
  { slug: "pediatric-dentistry", name: "Pediatric Dentistry", durationMin: 30, priceMin: 800, priceMax: 2500, bookingPrice: 800, description: "Gentle, friendly care for children's growing smiles." },
  { slug: "gum-treatment", name: "Gum Treatment (Periodontal Care)", durationMin: 45, priceMin: 3000, priceMax: 8000, bookingPrice: 1500, description: "Treats gum problems like bleeding and inflammation." },
];

const faqs = [
  ["How often should I visit the dentist?", "Every 6 months for a check-up and cleaning, or sooner if you have pain or bleeding gums."],
  ["Do dental treatments hurt?", "We use gentle techniques and local anesthesia, so most treatments are comfortable."],
  ["How long does a cleaning session take?", "About 30 to 45 minutes."],
  ["How do I reschedule or cancel?", "Open your dashboard and choose Reschedule, at least 24 hours before the visit."],
  ["Which payment methods do you accept?", "Cards, paid securely online. This demo runs in test mode."],
  ["Can I book a video consultation?", "Yes. Choose Video Consultation while booking and you will receive a Google Meet link."],
];

async function main() {
  // Users
  const owner = await prisma.user.upsert({
    where: { email: "owner@smilecare.test" },
    update: {},
    create: { name: "Dr. Aarav Mehta", email: "owner@smilecare.test", phone: "+919876543210", role: "OWNER", passwordHash: await bcrypt.hash("Owner@12345", 10) },
  });
  const patient = await prisma.user.upsert({
    where: { email: "patient@smilecare.test" },
    update: {},
    create: { name: "Priya Sharma", email: "patient@smilecare.test", phone: "+919800000001", role: "PATIENT", passwordHash: await bcrypt.hash("Patient@12345", 10) },
  });

  // Treatments
  for (const [i, t] of treatments.entries()) {
    const data = {
      name: t.name, description: t.description, durationMin: t.durationMin,
      priceMin: rupees(t.priceMin), priceMax: rupees(t.priceMax), bookingPrice: rupees(t.bookingPrice),
      imageUrl: `/images/treatments/${t.slug}.jpg`, sortOrder: i,
    };
    await prisma.treatment.upsert({ where: { slug: t.slug }, update: data, create: { slug: t.slug, ...data } });
  }

  // Working hours: Mon-Sat 09:00-19:00, break 13:00-14:00, Sunday off
  for (let day = 0; day <= 6; day++) {
    const data = { startTime: "09:00", endTime: "19:00", breakStart: "13:00", breakEnd: "14:00", slotMinutes: 30, isOff: day === 0 };
    await prisma.workingHours.upsert({ where: { dayOfWeek: day }, update: data, create: { dayOfWeek: day, ...data } });
  }

  // FAQs and reviews (re-created each run)
  await prisma.faq.deleteMany();
  await prisma.faq.createMany({ data: faqs.map(([question, answer], i) => ({ question, answer, sortOrder: i })) });
  await prisma.review.deleteMany();
  await prisma.review.createMany({
    data: [
      { authorName: "Priya S.", rating: 5, comment: "Dr. Aarav is amazing! Very gentle and explained everything clearly.", approved: true },
      { authorName: "Rahul K.", rating: 5, comment: "Best dental experience I have had. The clinic is clean and modern.", approved: true },
      { authorName: "Neha M.", rating: 5, comment: "Very professional and caring. Highly recommended.", approved: true },
    ],
  });

  // AI settings row (mock by default)
  await prisma.aiSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, provider: "mock" } });

  // Demo history for the patient dashboard (only once)
  if ((await prisma.appointment.count({ where: { patientId: patient.id } })) === 0) {
    const cleaning = await prisma.treatment.findUniqueOrThrow({ where: { slug: "teeth-cleaning" } });
    const when = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    when.setUTCHours(5, 0, 0, 0);                                   // 10:30 IST
    const appt = await prisma.appointment.create({
      data: { patientId: patient.id, treatmentId: cleaning.id, startTime: when, endTime: new Date(when.getTime() + 45 * 60_000), status: "COMPLETED" },
    });
    const payment = await prisma.payment.create({
      data: { appointmentId: appt.id, amount: cleaning.bookingPrice, status: "PAID", paidAt: when, stripeSessionId: "cs_test_seed_0001" },
    });
    await prisma.invoice.create({ data: { paymentId: payment.id, number: "INV-SEED-0001" } });
    const record = await prisma.treatmentRecord.create({
      data: { patientId: patient.id, appointmentId: appt.id, title: "Dental Cleaning (Scaling)", summary: "Routine scaling and polishing. Gums healthy.", date: when },
    });
    await prisma.prescription.create({
      data: { patientId: patient.id, recordId: record.id, medicine: "Fluoride mouthwash", instructions: "Rinse once daily for 2 weeks.", date: when },
    });
  }

  console.log("Seed complete. Owner:", owner.email, "Patient:", patient.email);
}

main().catch((e) => { console.error(e); throw e; }).finally(() => prisma.$disconnect());
