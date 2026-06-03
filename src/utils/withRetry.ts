import { Prisma } from "@prisma/client";

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 100
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2028") // Transaction conflict/timeout
      ) {
        attempt++;
        if (attempt >= maxRetries) throw error;
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Retry failed");
}
