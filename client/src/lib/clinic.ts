// Single source of truth for the (dummy) clinic identity. Keep in sync with docs/04-design/design-system.md.

export const clinic = {
  name: "SmileCare Clinic",
  tagline: "Healthy Smiles, Happier Lives",
  address: "123 Smile Street, Indiranagar, Bengaluru 560038",
  phone: (import.meta.env.VITE_CLINIC_PHONE as string | undefined) ?? "+91 98765 43210",
  email: "hello@smilecare.test",
  whatsapp: (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ?? "919876543210",
  hours: [
    { days: "Monday – Saturday", time: "9:00 AM – 7:00 PM" },
    { days: "Sunday", time: "Closed" },
  ],
  consultationFeePaise: 50000,
  stats: { patients: "5,000+", rating: "4.9/5", experience: "10+ Years" },
} as const;

export const telHref = `tel:${clinic.phone.replace(/[^+\d]/g, "")}`;
export const whatsappHref = `https://wa.me/${clinic.whatsapp.replace(/\D/g, "")}`;
export const mailHref = `mailto:${clinic.email}`;

export const doctor = {
  name: "Dr. Aarav Mehta",
  initials: "AM",
  title: "BDS, MDS: Conservative Dentistry & Endodontics",
  role: "Founder & Lead Dentist",
  intro:
    "Creating healthy, confident smiles with compassion and expertise. I combine advanced dental techniques with a gentle, patient-first approach so every visit is comfortable, transparent, and stress-free.",
  quote: "My goal is simple: to provide ethical, high-quality dental care in a comfortable and friendly environment, where every patient feels heard, respected, and cared for.",
  specialties: [
    { name: "General Dentistry", text: "Preventive care, cleanings and fillings" },
    { name: "Cosmetic Dentistry", text: "Whitening, veneers and smile design" },
    { name: "Dental Implants", text: "Single and full-mouth implant solutions" },
    { name: "Root Canal Treatment", text: "Painless, advanced and effective" },
    { name: "Gum Care", text: "Treatment for bleeding and inflammation" },
  ],
  education: [
    { title: "MDS: Conservative Dentistry & Endodontics", place: "Government Dental College, Mumbai" },
    { title: "BDS: Bachelor of Dental Surgery", place: "Maharashtra University of Health Sciences" },
    { title: "Certified in Aesthetic Dentistry", place: "International Continuum, USA" },
    { title: "Advanced Training in Dental Implants", place: "ITI, Switzerland" },
    { title: "Member: Indian Dental Association (IDA)", place: "" },
  ],
  journey: [
    { years: "2020 – Present", title: "Founder & Lead Dentist", place: "SmileCare Clinic, Bengaluru" },
    { years: "2016 – 2020", title: "Consultant Dentist", place: "Leading Dental Hospital, Mumbai" },
    { years: "2014 – 2016", title: "Senior Resident", place: "Government Dental College, Mumbai" },
    { years: "2013 – 2014", title: "Internship", place: "Civil Hospital, Mumbai" },
  ],
} as const;
