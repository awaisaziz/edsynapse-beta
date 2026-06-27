/**
 * Public-beta feedback form (Google Form).
 *
 * Defaults to the live published form; override with `NEXT_PUBLIC_FEEDBACK_URL`
 * in the environment to point the in-app feedback links somewhere else.
 *
 * `NEXT_PUBLIC_` so it's readable from client components; safe to expose (it's
 * just a public form link).
 */
export const FEEDBACK_URL =
  process.env.NEXT_PUBLIC_FEEDBACK_URL || "https://forms.gle/sSAexDXNKPuf3hWx9";

/** True once a real feedback URL has been configured. */
export const HAS_FEEDBACK_URL = FEEDBACK_URL !== "#";
