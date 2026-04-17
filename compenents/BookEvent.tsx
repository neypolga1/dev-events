'use client';

import { createBooking } from "@/lib/actions/booking.actions";
import { set } from "mongoose";
import posthog from "posthog-js";
import { useState } from "react";



const BookEvent =  ({eventId}: {eventId:string }) => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const hundleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { success } = await createBooking({eventId,email});

        if(success){
            setSubmitted(true);
            posthog.capture('booking_created',{eventId,email})
        }else{
            console.error('Booking creation failed');
            posthog.captureException('Booking creation failed')
        }
    }
    return (
        <div id="book-event">
            {submitted ? (
                <p className="text-sm">Thank you for signing up!</p>
            ) : (
                <form onSubmit={hundleSubmit}>
                    <div>
                        <label htmlFor="email">Email Address</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} id="email" placeholder="Enter your email address" />
                    </div>
                    <button type="submit" className="button-submit">Submit</button>
                </form>
            )}
        </div>
    )
}

export default BookEvent