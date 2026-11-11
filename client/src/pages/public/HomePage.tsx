import { AiTeaser } from "../../components/home/AiTeaser";
import { BookingCta } from "../../components/home/BookingCta";
import { DoctorIntro } from "../../components/home/DoctorIntro";
import { SmileGallery } from "../../components/home/SmileGallery";
import { Hero } from "../../components/home/Hero";
import { PaymentsStrip } from "../../components/home/PaymentsStrip";
import { TreatmentsPreview } from "../../components/home/TreatmentsPreview";
import { TrustBar } from "../../components/home/TrustBar";
import { WhyChooseUs } from "../../components/home/WhyChooseUs";
import { FaqSection } from "../../components/faq/FaqSection";
import { ReviewsSection } from "../../components/reviews/ReviewsSection";

export function HomePage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <TreatmentsPreview />
      <DoctorIntro />
      <WhyChooseUs />
      <SmileGallery />
      <ReviewsSection limit={3} tinted={false} />
      <AiTeaser />
      <PaymentsStrip />
      <FaqSection limit={3} />
      <BookingCta />
    </>
  );
}