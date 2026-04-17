import EventDetails from "@/compenents/EventDetails";
import { Suspense } from "react";

const EventDetailsPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
    const slug = params.then(p => p.slug);
  return (
    <main>
      <Suspense fallback={<p>Loading event details...</p>}>
        <EventDetails params={slug} />
      </Suspense>
    </main>
  )
}

export default EventDetailsPage