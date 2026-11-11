/**
 * Central image manifest for SmileCare.
 * Place the corresponding files inside public/images using these exact names.
 */
export const clinicImages = {
  hero: "/images/hero/hero-consultation.jpg",
  doctor: "/images/doctor/dr-aarav-mehta.jpg",
  clinicTreatmentRoom: "/images/clinic/clinic-treatment-room.jpg",
  clinicReception: "/images/clinic/clinic-reception.jpg",
  aiAssistant: "/images/ai/smilecare-assistant.jpg",
  beforeAfter: [
    {
      before: "/images/before-after/cleaning/before-cleaning.jpg",
      after: "/images/before-after/cleaning/after-cleaning.jpg",
      title: "Smile care Teeth Whitening",
    },
    {
      before: "/images/before-after/cleaning/before-cleaning.jpg",
      after: "/images/before-after/cleaning/after-cleaning.jpg",
      title: "Smile care Dental Cleaning",
    },
    {
      before: "/images/before-after/veneers/before-veneers.jpg",
      after: "/images/before-after/veneers/after-veneers.jpg",
      title: "Smile care Dental Veneers",
    },
    {
      before: "/images/before-after/implants/before-dental-implants.jpg",
      after: "/images/before-after/implants/after-dental-implants.jpg",
      title: "Smile care Dental Implants",
    }
  ],
  treatments: {
    "general-consultation": "/images/treatments/general-consultation.jpg",
    "teeth-cleaning": "/images/treatments/teeth-cleaning.jpg",
    "teeth-whitening": "/images/treatments/teeth-whitening.jpg",
    "root-canal": "/images/treatments/root-canal.jpg",
    "dental-implants": "/images/treatments/dental-implants.jpg",
    veneers: "/images/treatments/veneers.jpg",
    "pediatric-dentistry": "/images/treatments/pediatric-dentistry.jpg",
    "gum-treatment": "/images/treatments/gum-treatment.jpg",
  } as const,
} as const;

export function treatmentImageFor(slug: string): string {
  return clinicImages.treatments[slug as keyof typeof clinicImages.treatments]
    ?? clinicImages.treatments["general-consultation"];
}
