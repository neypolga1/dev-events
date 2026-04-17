import EventCard from "@/compenents/EventCard"
import ExploreBtn from "@/compenents/ExploreBtn"
import { IEvent } from "@/database";
import { cacheLife } from "next/cache";
import { events } from "@/lib/constants";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const  Page = async () => {
  'use cache';
  cacheLife('hours');
  // const response = await fetch(`${BASE_URL}/api/events`);
  // const {events} = await response.json();

  return (
    <section>
      <h1 className='text-center'>The Hub for Every Dev <br/> Event You Can't Miss</h1>
      <p className='text-center mt-5'>Hackathons, Meetups, and Conferences, All in One Place</p>

      <ExploreBtn />

      <div className="mt-20 space-y-7">
        <h3>Featured Events</h3>
        <ul className="events list-none">
          {
            events && events.length > 0 && events.map((event) => (
              <li key={event.slug}>
                <EventCard {...(event as IEvent)} />
              </li>
            ))
          }
        </ul>
      </div>
    </section>
  )
}

export default Page