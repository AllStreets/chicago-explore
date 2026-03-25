// Shared module-level train animation state — survives page navigation.
// Both HomePage and TransitPage point trainStateRef at this same object,
// so switching between pages never loses the current interpolated positions.
export const sharedTrainState = {}
