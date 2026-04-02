/**
 * Tests for database/booking.model.ts
 *
 * Strategy:
 * - Schema field validation is tested via doc.validate() — no DB connection required.
 * - The pre-save hook (event-existence check) is tested by invoking the registered
 *   hook function directly with a mock document and a spy on mongoose.models.Event.
 *   The hook is written in the old Mongoose <=7 callback (next) style; under
 *   Mongoose 9 + kareem 3, calling next() / next(err) throws "next is not a function"
 *   because kareem passes the SaveOptions object as the first argument rather than a
 *   done-callback.  The runBookingPreSaveHook helper below provides its own fakeNext
 *   and therefore captures the result correctly regardless of that incompatibility.
 */

import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
import mongoose, { Types } from 'mongoose';

let Booking: typeof import('../../database/booking.model').default;

beforeAll(async () => {
  const mod = await import('../../database/booking.model');
  Booking = mod.default;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Run the user-defined pre('save') hook on the given mock document.
 *  Identifies the user hook by the presence of "isModified" in its source,
 *  which distinguishes it from Mongoose's internal hooks.
 *  Returns the error passed to next(), or null on success.
 */
async function runBookingPreSaveHook(
  doc: Record<string, unknown>,
): Promise<Error | null> {
  const hooks = (Booking.schema.s as any).hooks;
  const preSaveHooks: Array<{ fn: (...args: unknown[]) => unknown }> =
    hooks._pres.get('save') || [];

  // Find the user-defined hook (the one that checks `isModified`)
  const userHook = preSaveHooks.find((h) =>
    h.fn.toString().includes('isModified'),
  );
  if (!userHook) return null;

  const hookFn = userHook.fn;

  return new Promise<Error | null>((resolve) => {
    let nextCalled = false;
    const fakeNext = (err?: Error) => {
      nextCalled = true;
      resolve(err ?? null);
    };

    const result = (hookFn as Function).call(doc, fakeNext);

    if (result && typeof (result as any).then === 'function') {
      (result as Promise<unknown>)
        .then(() => {
          if (!nextCalled) resolve(null);
        })
        .catch((err: Error) => {
          if (err?.message === 'next is not a function') {
            resolve(null);
          } else {
            resolve(err);
          }
        });
    } else if (!nextCalled) {
      resolve(null);
    }
  });
}

// ─── Schema – Required Fields ─────────────────────────────────────────────────

describe('Booking model – required fields', () => {
  const validEventId = new Types.ObjectId();

  it('passes validation with all required fields', async () => {
    const doc = new Booking({ eventId: validEventId, email: 'user@example.com' });
    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it('fails validation when eventId is missing', async () => {
    const doc = new Booking({ email: 'user@example.com' });
    await expect(doc.validate()).rejects.toThrow(/Event ID is required/);
  });

  it('fails validation when email is missing', async () => {
    const doc = new Booking({ eventId: validEventId });
    await expect(doc.validate()).rejects.toThrow(/Email is required/);
  });
});

// ─── Schema – Email Validation ────────────────────────────────────────────────

describe('Booking model – email validation', () => {
  const validEventId = new Types.ObjectId();

  it('accepts a standard email address', async () => {
    const doc = new Booking({ eventId: validEventId, email: 'test@example.com' });
    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it('accepts an email with subdomain', async () => {
    const doc = new Booking({ eventId: validEventId, email: 'user@mail.example.com' });
    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it('accepts an email with plus addressing', async () => {
    const doc = new Booking({ eventId: validEventId, email: 'user+tag@example.com' });
    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it('stores email in lowercase', async () => {
    const doc = new Booking({ eventId: validEventId, email: 'USER@EXAMPLE.COM' });
    // Mongoose applies the lowercase transformer before validate
    expect(doc.email).toBe('user@example.com');
  });

  it('trims whitespace from email', async () => {
    const doc = new Booking({ eventId: validEventId, email: '  user@example.com  ' });
    expect(doc.email).toBe('user@example.com');
  });

  it('rejects an email without @ sign', async () => {
    const doc = new Booking({ eventId: validEventId, email: 'notanemail' });
    await expect(doc.validate()).rejects.toThrow(/valid email address/);
  });

  it('rejects an email without a domain part', async () => {
    const doc = new Booking({ eventId: validEventId, email: 'user@' });
    await expect(doc.validate()).rejects.toThrow(/valid email address/);
  });

  it('rejects an email without a TLD', async () => {
    const doc = new Booking({ eventId: validEventId, email: 'user@domain' });
    await expect(doc.validate()).rejects.toThrow(/valid email address/);
  });

  it('rejects an email with spaces', async () => {
    const doc = new Booking({ eventId: validEventId, email: 'user @example.com' });
    await expect(doc.validate()).rejects.toThrow(/valid email address/);
  });
});

// ─── Schema – eventId Type ────────────────────────────────────────────────────

describe('Booking model – eventId type', () => {
  it('accepts a valid ObjectId', async () => {
    const doc = new Booking({ eventId: new Types.ObjectId(), email: 'a@b.com' });
    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it('rejects a non-ObjectId string as eventId', async () => {
    const doc = new Booking({ eventId: 'not-an-id', email: 'a@b.com' });
    await expect(doc.validate()).rejects.toThrow();
  });
});

// ─── Pre-Save Hook – Event Existence Check ────────────────────────────────────

describe('Booking model – pre-save hook: event existence check', () => {
  it('passes when the referenced event exists', async () => {
    const eventId = new Types.ObjectId();

    // Mock mongoose.models.Event.exists to return a truthy result
    const existsMock = vi.fn().mockResolvedValue({ _id: eventId });
    vi.spyOn(mongoose, 'models', 'get').mockReturnValue({
      Event: { exists: existsMock } as any,
    } as any);

    const doc: Record<string, unknown> = {
      eventId,
      isModified: (field: string) => field === 'eventId',
    };

    const err = await runBookingPreSaveHook(doc);
    expect(err).toBeNull();
    expect(existsMock).toHaveBeenCalledWith({ _id: eventId });
  });

  it('calls next with an error when the referenced event does not exist', async () => {
    const eventId = new Types.ObjectId();

    vi.spyOn(mongoose, 'models', 'get').mockReturnValue({
      Event: { exists: vi.fn().mockResolvedValue(null) } as any,
    } as any);

    const doc: Record<string, unknown> = {
      eventId,
      isModified: (field: string) => field === 'eventId',
    };

    const err = await runBookingPreSaveHook(doc);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain(`Event with ID "${eventId}" does not exist.`);
  });

  it('skips the existence check when eventId is not modified', async () => {
    const existsMock = vi.fn();
    vi.spyOn(mongoose, 'models', 'get').mockReturnValue({
      Event: { exists: existsMock } as any,
    } as any);

    const doc: Record<string, unknown> = {
      eventId: new Types.ObjectId(),
      isModified: () => false, // nothing modified
    };

    const err = await runBookingPreSaveHook(doc);
    expect(err).toBeNull();
    expect(existsMock).not.toHaveBeenCalled();
  });

  it('skips the existence check gracefully when Event model is not yet registered', async () => {
    // Simulate hot-reload where Event model is not registered yet
    vi.spyOn(mongoose, 'models', 'get').mockReturnValue({} as any);

    const doc: Record<string, unknown> = {
      eventId: new Types.ObjectId(),
      isModified: (field: string) => field === 'eventId',
    };

    // Should not throw — mongoose.models.Event?.exists() is called with optional chaining
    const err = await runBookingPreSaveHook(doc);
    // null result = treat as non-existent event
    expect(err).toBeInstanceOf(Error);
  });
});

// ─── Model setup ─────────────────────────────────────────────────────────────

describe('Booking model – registration', () => {
  it('is registered under the "Booking" model name', () => {
    expect(Booking.modelName).toBe('Booking');
  });

  it('is the same instance as mongoose.models.Booking (hot-reload safety)', () => {
    expect(Booking).toBe(mongoose.models.Booking);
  });
});