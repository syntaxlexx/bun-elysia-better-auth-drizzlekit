import { ServiceError } from "./services/errors.ts"

export async function run<T>(
  set: { status?: number | string },
  work: () => Promise<T>
): Promise<T | ServiceError["body"]> {
  try {
    return await work()
  } catch (error) {
    if (error instanceof ServiceError) {
      set.status = error.status
      return error.body
    }
    throw error
  }
}
