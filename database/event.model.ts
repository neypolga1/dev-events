import { createHash } from 'crypto';
import mongoose, { Schema, Document, Model } from 'mongoose';

// TypeScript interface representing a single Event document
export interface IEvent extends Document {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    // Unique slug auto-generated from title in the pre-save hook
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    overview: {
      type: String,
      required: [true, 'Overview is required'],
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Image URL is required'],
      trim: true,
    },
    venue: {
      type: String,
      required: [true, 'Venue is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    // Stored as ISO date string after normalization in pre-save hook
    date: {
      type: String,
      required: [true, 'Date is required'],
    },
    // Stored in HH:MM (24-hour) format after normalization in pre-save hook
    time: {
      type: String,
      required: [true, 'Time is required'],
    },
    mode: {
      type: String,
      required: [true, 'Mode is required'],
      enum: {
        values: ['online', 'offline', 'hybrid'],
        message: 'Mode must be online, offline, or hybrid',
      },
    },
    audience: {
      type: String,
      required: [true, 'Audience is required'],
      trim: true,
    },
    agenda: {
      type: [String],
      required: [true, 'Agenda is required'],
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: 'Agenda must have at least one item',
      },
    },
    organizer: {
      type: String,
      required: [true, 'Organizer is required'],
      trim: true,
    },
    tags: {
      type: [String],
      required: [true, 'Tags are required'],
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: 'Tags must have at least one item',
      },
    },
  },
  {
    // Automatically manages createdAt and updatedAt fields
    timestamps: true,
  }
);

/**
 * Generates a URL-friendly slug from a string.
 *
 * Step 1 – NFD normalization: decomposes accented characters into base letter +
 * combining mark (e.g. é → e + \u0301), then strips the marks. This preserves
 * the readable base letters for most European scripts.
 *
 * Step 2 – Fallback: titles that are entirely non-ASCII after normalization
 * (e.g. Arabic, CJK) would produce an empty string. Instead, derive a
 * deterministic 12-char SHA-256 prefix from the original title so the slug is
 * always non-empty, URL-safe, and collision-resistant.
 */
function generateSlug(title: string): string {
  const slug = title
    .normalize('NFD')                  // decompose accented glyphs
    .replace(/[\u0300-\u036f]/g, '')   // strip combining diacritical marks
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')              // spaces → hyphens
    .replace(/[^a-z0-9-]/g, '')        // drop all remaining non-ASCII chars
    .replace(/-+/g, '-')               // collapse consecutive hyphens
    .replace(/^-|-$/g, '');            // trim leading / trailing hyphens

  if (slug) return slug;

  // Deterministic fallback: short SHA-256 hash of the original title
  const hash = createHash('sha256').update(title).digest('hex').slice(0, 12);
  return `event-${hash}`;
}

/**
 * Normalizes a date string to YYYY-MM-DD without timezone shifts.
 *
 * ISO YYYY-MM-DD inputs are validated and returned directly — no Date object
 * involved — to avoid the UTC-vs-local shift that new Date() + toISOString()
 * introduces in UTC+ timezones (e.g. "2024-12-31" → "2024-12-30" at UTC+5).
 *
 * Other recognisable formats (e.g. "December 31, 2024") are parsed via the
 * Date constructor and reconstructed with LOCAL-time getters so the calendar
 * date always matches what was supplied.
 */
function normalizeDate(input: string): string {
  // Fast path: already YYYY-MM-DD — validate components and return as-is
  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const month = parseInt(isoMatch[2], 10);
    const day   = parseInt(isoMatch[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      throw new Error(`Invalid date: "${input}"`);
    }
    return input;
  }

  // Other formats: parse then reconstruct using LOCAL getters (not UTC)
  // so the calendar date is preserved regardless of server timezone
  const parsed = new Date(input);
  if (isNaN(parsed.getTime())) {
    throw new Error(
      `Invalid date format: "${input}". Expected YYYY-MM-DD or a recognisable date string.`
    );
  }

  const year  = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day   = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Normalizes a time string to HH:MM (24-hour) format.
 * Supports both "HH:MM" and "H:MM AM/PM" input formats.
 */
function normalizeTime(time: string): string {
  // Handle 12-hour format (e.g., "2:30 PM")
  const twelveHourMatch = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHourMatch) {
    let hours = parseInt(twelveHourMatch[1], 10);
    const minutes = twelveHourMatch[2];
    const period = twelveHourMatch[3].toUpperCase();

    if (period === 'AM' && hours === 12) hours = 0;
    if (period === 'PM' && hours !== 12) hours += 12;

    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  // Handle 24-hour format (e.g., "14:30")
  const twentyFourHourMatch = time.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHourMatch) {
    const hours = String(parseInt(twentyFourHourMatch[1], 10)).padStart(2, '0');
    return `${hours}:${twentyFourHourMatch[2]}`;
  }

  throw new Error(`Invalid time format: "${time}". Expected HH:MM or H:MM AM/PM.`);
}

// Pre-save hook: handles slug generation, date normalization, and time normalization.
// Mongoose 9 uses async/await middleware — throw to abort, no next() callback needed.
EventSchema.pre<IEvent>('save', async function () {
  // Only regenerate slug if title has been modified (avoids unnecessary updates)
  if (this.isModified('title')) {
    this.slug = generateSlug(this.title);
  }

  // Normalize date to YYYY-MM-DD if modified.
  // normalizeDate() avoids timezone shifts by never calling toISOString().
  if (this.isModified('date')) {
    this.date = normalizeDate(this.date);
  }

  // Normalize time to HH:MM (24-hour) format if modified.
  // normalizeTime() throws on invalid input, which aborts the save automatically.
  if (this.isModified('time')) {
    this.time = normalizeTime(this.time);
  }
});

// Create unique index on slug for better performance
EventSchema.index({ slug: 1 }, { unique: true });

// Create compound index for common queries
EventSchema.index({ date: 1, mode: 1 });

// Use existing model in hot-reload environments (Next.js dev mode) or create a new one
const Event: Model<IEvent> =
  mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);

export default Event;
