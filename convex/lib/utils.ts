import * as Random from "effect/Random"
import * as Effect from "effect/Effect"
import * as Chunk from "effect/Chunk"

/**
 * Shuffles an array using Effect/Random and returns a new shuffled array.
 * @param array The array to shuffle
 * @returns A shuffled array (Effect-wrapped)
 */
export const shuffleArray = <A>(array: readonly A[]): readonly A[] => Random.shuffle(array).pipe(Effect.runSync, Chunk.toArray)
