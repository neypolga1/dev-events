import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import mongoose from 'mongoose';

// Set the env variable before any import of the module under test
const MOCK_URI = 'mongodb://localhost:27017/testdb';

// Helper to get a fresh module import with cleared cache
async function importConnectDB() {
  vi.resetModules();
  // Re-stub env in case it was cleared by a previous reset
  vi.stubEnv('MONGODB_URI', MOCK_URI);
  const mod = await import('../../lib/mongodb');
  return mod.default;
}

beforeEach(() => {
  vi.stubEnv('MONGODB_URI', MOCK_URI);
  // Reset the global mongoose cache between tests
  global.mongoose = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  global.mongoose = undefined;
});

// ─── Module-level guard ───────────────────────────────────────────────────────

describe('lib/mongodb – module-level guard', () => {
  it('throws when MONGODB_URI is not set', async () => {
    vi.unstubAllEnvs();
    delete process.env.MONGODB_URI;
    vi.resetModules();
    await expect(import('../../lib/mongodb')).rejects.toThrow(
      'Please define the MONGODB_URI environment variable inside .env.local'
    );
  });
});

// ─── connectDB – caching behaviour ───────────────────────────────────────────

describe('connectDB – connection caching', () => {
  it('calls mongoose.connect exactly once for multiple invocations', async () => {
    const connectDB = await importConnectDB();
    const fakeMongoose = mongoose as unknown as typeof mongoose;
    const connectSpy = vi
      .spyOn(fakeMongoose, 'connect')
      .mockResolvedValue(mongoose);

    await connectDB();
    await connectDB();
    await connectDB();

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('returns the same cached connection on subsequent calls', async () => {
    const connectDB = await importConnectDB();
    vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);

    const first = await connectDB();
    const second = await connectDB();

    expect(first).toBe(second);
  });

  it('passes bufferCommands: false to mongoose.connect', async () => {
    const connectDB = await importConnectDB();
    const connectSpy = vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);

    await connectDB();

    expect(connectSpy).toHaveBeenCalledWith(MOCK_URI, { bufferCommands: false });
  });

  it('connects with the correct URI from environment variable', async () => {
    const connectDB = await importConnectDB();
    const connectSpy = vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);

    await connectDB();

    expect(connectSpy).toHaveBeenCalledWith(MOCK_URI, expect.any(Object));
  });
});

// ─── connectDB – error handling ───────────────────────────────────────────────

describe('connectDB – error handling', () => {
  it('re-throws connection errors', async () => {
    const connectDB = await importConnectDB();
    vi.spyOn(mongoose, 'connect').mockRejectedValue(new Error('Connection refused'));

    await expect(connectDB()).rejects.toThrow('Connection refused');
  });

  it('resets the cached promise on failure to allow retry', async () => {
    const connectDB = await importConnectDB();
    const connectSpy = vi
      .spyOn(mongoose, 'connect')
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValueOnce(mongoose);

    // First call should fail
    await expect(connectDB()).rejects.toThrow('First failure');

    // Second call should attempt a new connection (promise was cleared)
    await expect(connectDB()).resolves.toBeDefined();
    expect(connectSpy).toHaveBeenCalledTimes(2);
  });

  it('does not call mongoose.connect again while a pending promise exists', async () => {
    const connectDB = await importConnectDB();
    let resolveConnect!: (value: typeof mongoose) => void;
    const pendingPromise = new Promise<typeof mongoose>((resolve) => {
      resolveConnect = resolve;
    });

    const connectSpy = vi.spyOn(mongoose, 'connect').mockReturnValue(pendingPromise as any);

    // Start two simultaneous calls
    const call1 = connectDB();
    const call2 = connectDB();

    // Resolve the underlying promise
    resolveConnect(mongoose);

    await call1;
    await call2;

    // mongoose.connect should only have been invoked once
    expect(connectSpy).toHaveBeenCalledTimes(1);
  });
});

// ─── connectDB – global cache initialisation ──────────────────────────────────

describe('connectDB – global cache', () => {
  it('initialises the global.mongoose cache when absent', async () => {
    global.mongoose = undefined;
    await importConnectDB(); // module load sets global.mongoose
    expect(global.mongoose).toBeDefined();
  });

  it('reuses an existing global.mongoose cache', async () => {
    const existingConn = mongoose;
    global.mongoose = { conn: existingConn, promise: null };

    const connectDB = await importConnectDB();
    const connectSpy = vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);

    const result = await connectDB();
    // The existing cached connection should be returned directly
    expect(result).toBe(existingConn);
    expect(connectSpy).not.toHaveBeenCalled();
  });
});