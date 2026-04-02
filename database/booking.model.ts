import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// TypeScript interface representing a single Booking document
export interface IBooking extends Document {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    // References the Event collection — indexed for faster lookups
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      // RFC 5322-compliant email regex validation
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
  },
  {
    // Automatically manages createdAt and updatedAt fields
    timestamps: true,
  }
);

// Pre-save hook: verifies that the referenced Event exists before saving
BookingSchema.pre<IBooking>('save', async function (next) {
  if (this.isModified('eventId')) {
    const eventExists = await mongoose.models.Event?.exists({
      _id: this.eventId,
    });

    if (!eventExists) {
      return next(
        new Error(`Event with ID "${this.eventId}" does not exist.`)
      );
    }
  }

  next();
});

// Create index on eventId for faster queries
BookingSchema.index({ eventId: 1 });

// Create compound index for common queries (events bookings by date)
BookingSchema.index({ eventId: 1, createdAt: -1 });

// Create index on email for user booking lookups
BookingSchema.index({ email: 1 });

// Enforce one booking per events per email
BookingSchema.index({ eventId: 1, email: 1 }, { unique: true, name: 'uniq_event_email' });

// Use existing model in hot-reload environments (Next.js dev mode) or create a new one
const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;
