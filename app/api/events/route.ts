import { Event } from "@/database";
import { v2 as cloudinary } from 'cloudinary';
import connectDB from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function POST(rea:NextRequest) {
    try {
        await connectDB();

        const formData = await rea.formData();

        let event;

        try {
            event = Object.fromEntries(formData.entries());
        } catch (e) {
           console.log(e);
           return NextResponse.json({message:'Invalid Json Format'},{status:400}); 
        }

        const file = formData.get('image') as File;

        if(!file) return NextResponse.json({message:'Image file is required'},{status:400});

        let tags = JSON.parse(event.tags as string);
        let agenda = JSON.parse(event.agenda as string);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const uploadResult = await new Promise((resolve,reject) => {
            cloudinary.uploader.upload_stream({'resource_type':'image'},(error,result) => {
                if(error) reject(error);
                resolve(result);
            }).end(buffer);
        })

        event.image = (uploadResult as { secure_url: string }).secure_url;

        const createdEvent = await Event.create({...event,tags,agenda});

        return NextResponse.json({message:'event created successfully', event: createdEvent}, {status:201});
    } catch (e) {
       console.log(e);
       return NextResponse.json({message:'Event creation failed',error: e instanceof Error ? e.message : 'Unknown error'}, {status:500}); 
    }
}

export async function GET(){
    try {
        await connectDB();
        const events = await Event.find().sort({createdAt:-1});
        return NextResponse.json({message:'Events fetched successfully', events}, {status:200});
    } catch (error) {
        return NextResponse.json({Message:'Failed to fetch events', error: error instanceof Error ? error.message : 'Unknown error'}, {status:500});
    }
}