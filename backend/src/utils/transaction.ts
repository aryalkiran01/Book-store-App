import mongoose, { ClientSession } from "mongoose";

/**
 * Executes a callback within a MongoDB multi-document ACID transaction.
 * If the current MongoDB deployment does not support transactions (e.g., local standalone without replica set),
 * it seamlessly and safely executes the operation with null session fallback.
 */
export async function runInTransaction<T>(
  work: (session: ClientSession | null) => Promise<T>
): Promise<T> {
  let session: ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    let result: T | undefined;

    await session.withTransaction(async () => {
      result = await work(session);
    });

    return result as T;
  } catch (err: any) {
    // Graceful fallback for standalone MongoDB instances without replica set
    if (
      err.message?.includes("replica set member") ||
      err.message?.includes("Transaction numbers are only allowed") ||
      err.message?.includes("Transactions are not supported")
    ) {
      return await work(null);
    }
    throw err;
  } finally {
    if (session) {
      await session.endSession().catch(() => {});
    }
  }
}
