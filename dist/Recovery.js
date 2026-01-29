/**
 * @blank-utils/load-balancer
 *
 * Recovery function support for handling total failures
 */
import { Effect } from "effect";
/**
 * Apply a recovery function to handle total failures
 */
export const withRecovery = (effect, request, recoveryFn, getContext) => {
    if (!recoveryFn) {
        return effect;
    }
    return effect.pipe(Effect.catchAll((error) => Effect.gen(function* () {
        const context = getContext();
        const recoveryResponse = yield* recoveryFn(request, context);
        if (recoveryResponse) {
            return recoveryResponse;
        }
        return yield* Effect.fail(error);
    })));
};
//# sourceMappingURL=Recovery.js.map