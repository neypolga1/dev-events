/**
 * Tests for database/index.ts
 *
 * Verifies that the barrel file correctly re-exports the Event and Booking
 * Mongoose models and their TypeScript interfaces.  No DB connection is needed;
 * we only check that the imported values are the expected Mongoose Model objects.
 */

import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';

// ─── Named exports ────────────────────────────────────────────────────────────

describe('database/index – model exports', () => {
  it('exports the Event model', async () => {
    const { Event } = await import('../../database/index');
    expect(Event).toBeDefined();
  });

  it('exports the Booking model', async () => {
    const { Booking } = await import('../../database/index');
    expect(Booking).toBeDefined();
  });

  it('Event export has Mongoose Model methods', async () => {
    const { Event } = await import('../../database/index');
    expect(typeof Event.find).toBe('function');
    expect(typeof Event.findOne).toBe('function');
    expect(typeof Event.deleteOne).toBe('function');
  });

  it('Booking export has Mongoose Model methods', async () => {
    const { Booking } = await import('../../database/index');
    expect(typeof Booking.find).toBe('function');
    expect(typeof Booking.findOne).toBe('function');
    expect(typeof Booking.deleteOne).toBe('function');
  });

  it('Event export has the correct model name', async () => {
    const { Event } = await import('../../database/index');
    expect(Event.modelName).toBe('Event');
  });

  it('Booking export has the correct model name', async () => {
    const { Booking } = await import('../../database/index');
    expect(Booking.modelName).toBe('Booking');
  });

  it('Event export is the same model instance as the direct import', async () => {
    const { Event } = await import('../../database/index');
    const { default: DirectEvent } = await import('../../database/event.model');
    // Both must reference the same registered Mongoose model
    expect(Event.modelName).toBe(DirectEvent.modelName);
    expect(Event).toBe(DirectEvent);
  });

  it('Booking export is the same model instance as the direct import', async () => {
    const { Booking } = await import('../../database/index');
    const { default: DirectBooking } = await import('../../database/booking.model');
    expect(Booking.modelName).toBe(DirectBooking.modelName);
    expect(Booking).toBe(DirectBooking);
  });

  it('Event model is accessible via mongoose.models after importing', async () => {
    await import('../../database/index');
    expect(mongoose.models.Event).toBeDefined();
  });

  it('Booking model is accessible via mongoose.models after importing', async () => {
    await import('../../database/index');
    expect(mongoose.models.Booking).toBeDefined();
  });
});