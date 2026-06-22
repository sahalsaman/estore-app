import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
// Database name comes from env (e.g. DB_NAME=ESTORE_QA). Overrides any db in the
// URI; falls back to the URI's database when unset.
const DB_NAME = process.env.DB_NAME;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache =
  global._mongooseCache ?? (global._mongooseCache = { conn: null, promise: null });

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI!, {
      bufferCommands: false,
      ...(DB_NAME ? { dbName: DB_NAME } : {}),
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}
