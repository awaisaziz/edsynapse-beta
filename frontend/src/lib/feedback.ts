/**
 * Public-beta feedback form (Google Form).
 *
 * Set `NEXT_PUBLIC_FEEDBACK_URL` in the environment to the live Google Form URL.
 * Until then this falls back to "#" so the in-app feedback links render as a
 * harmless placeholder (they go nowhere rather than breaking the build).
 *
 * `NEXT_PUBLIC_` so it's readable from client components; safe to expose (it's
 * just a public form link).
 */
export const FEEDBACK_URL = process.env.NEXT_PUBLIC_FEEDBACK_URL || "#";

/** True once a real feedback URL has been configured. */
export const HAS_FEEDBACK_URL = FEEDBACK_URL !== "#";
