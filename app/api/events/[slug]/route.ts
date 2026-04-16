import { Event, IEvent } from "@/database";
import connectDB from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";


//Interface for the route's dynamic parameters
interface RouteParams {
    params: Promise<{ slug: string }>;
}


//GET: Fetch a single event by its unique slug
export async function GET(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    try {

        //1. Establish database connection
        await connectDB();

        //2. Await and validate the slug parameter
        const { slug } = await params;
        console.log("Requested Slug:", slug);

        if (!slug || typeof slug !== 'string') {
            return NextResponse.json({ message: 'A valid event slug is required.' }, { status: 400 });
        }

        //2.5 sanitize the slug
        const sanitizedSlug = slug.trim().toLocaleLowerCase();
        

        // 3. Query the database
        // We use .lean() for better performance as we are only reading data
        const event: IEvent | null = await Event.findOne({ slug: sanitizedSlug }).lean()

        // 4. Handle "Not Found" case
        if (!event) {
            return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
        }

        // 5. Return the event data
        return NextResponse.json({ message: 'Event fetched successfully', event }, { status: 200 });
    } catch (error) {
        // log error for debbuging (omly in development)
        if(process.env.NODE_ENV === 'development') {
            console.error('Error fetching event by slug:', error);
        }

        // handle specific error types
        if (error instanceof Error) {
            if(error.message.includes('MONGODB_URI')){
                return NextResponse.json({message:'DataBase configuration error'}, {status:500});
            }
        }

        // Return a generic error response for any other unhandled errors
        return NextResponse.json(
            { error: "Failed to fetch event", details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );

    }
}