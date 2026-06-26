"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"

const SESSION_KEY = "/api/auth/me"

/**
 * Refresh the cached session for every `useAuth()` consumer. Must be called
 * after any auth state change (login/register/logout) so pages don't act on a
 * stale "logged out" cache — otherwise e.g. /onboarding bounces a freshly
 * signed-up user back to /sign-in (and then to /).
 */
async function revalidateSession(): Promise<void> {
  await mutate(SESSION_KEY)
}

export type LearningModality = "visual" | "text" | "audio" | "all"
export type LearningPace = "deep" | "methodical" | "regular"

export interface AuthUser {
  id: string
  email: string
  name: string
  role: "teacher" | "student" | "admin"
  institution: string
  firstName: string
  lastName: string
  bio: string
  educationLevel: string
  field: string
  title: string
  learningModality: LearningModality
  learningPace: LearningPace
  onboarded: boolean
  emailVerified: boolean
}

export interface ProfileInput {
  firstName?: string
  lastName?: string
  bio?: string
  institution?: string
  field?: string
  title?: string
  educationLevel?: string
  learningModality?: LearningModality
  learningPace?: LearningPace
  onboarded?: boolean
}

const fetcher = async (url: string): Promise<{ user: AuthUser | null }> => {
  const res = await fetch(url)
  if (res.status === 401) return { user: null }
  if (!res.ok) throw new Error("Failed to load session")
  return res.json()
}

/** Reactive current-user hook backed by /api/auth/me. */
export function useAuth() {
  const { data, error, isLoading, mutate } = useSWR(SESSION_KEY, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })
  return {
    user: data?.user ?? null,
    isLoading,
    error,
    refresh: mutate,
  }
}

/**
 * Redirect logged-in but not-yet-onboarded users to /onboarding. Call from
 * authed landing pages and the app shell so the required onboarding step can't
 * be skipped by URL.
 */
export function useRequireOnboarded() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  useEffect(() => {
    if (!isLoading && user && !user.onboarded) {
      router.replace("/onboarding")
    }
  }, [user, isLoading, router])
}

/** Error thrown by login/register that carries the server's machine-readable code. */
export class AuthRequestError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = "AuthRequestError"
    this.code = code
  }
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new AuthRequestError(data.error ?? "Login failed", data.code)
  await revalidateSession()
  return data.user
}

/**
 * Resend the email-verification link for a (possibly logged-out) address. Always
 * resolves — the server responds generically whether or not the account exists.
 */
export async function resendVerification(email?: string): Promise<void> {
  await fetch("/api/auth/resend-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // With an email, resends for a logged-out address (sign-in/sign-up screens);
    // without one, resends for the signed-in user (Settings).
    body: JSON.stringify(email ? { email } : {}),
  })
}

export async function register(input: {
  firstName: string
  lastName: string
  email: string
  password: string
  role: "teacher" | "student"
  institution?: string
}): Promise<{ needsVerification: boolean; emailSent: boolean; email: string }> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Registration failed")
  // No session is created at signup anymore — the account must verify its email
  // first, so there's nothing to revalidate here.
  return {
    needsVerification: Boolean(data.needsVerification),
    emailSent: Boolean(data.emailSent),
    email: input.email,
  }
}

/** Update the current user's profile (Settings) or complete onboarding. */
export async function updateProfile(patch: ProfileInput): Promise<AuthUser> {
  const res = await fetch("/api/auth/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to update profile")
  return data.user
}

/** Complete the required onboarding step (sets onboarded = true). */
export async function completeOnboarding(input: ProfileInput): Promise<AuthUser> {
  return updateProfile({ ...input, onboarded: true })
}

/** Permanently delete the current account (requires the current password). */
export async function deleteAccount(password: string): Promise<void> {
  const res = await fetch("/api/auth/account", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? "Failed to delete account")
  }
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" })
  await revalidateSession()
}

/**
 * Request a password-reset email. Always resolves (the server responds the same
 * whether or not the email exists) so callers can show a single generic message.
 */
export async function requestPasswordReset(email: string): Promise<string> {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 429) throw new Error(data.error ?? "Too many attempts. Try again later.")
  return data.message ?? "If an account exists for that email, a reset link is on its way."
}

/** Complete a password reset with the token from the emailed link. */
export async function resetPassword(token: string, password: string): Promise<void> {
  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? "Failed to reset password")
  }
}

/** Confirm an email address with the token from the emailed link. */
export async function verifyEmail(token: string): Promise<{ role: string; onboarded: boolean }> {
  const res = await fetch("/api/auth/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to verify email")
  }
  // Verification logs the user in (a session cookie was set) — refresh the
  // client session so the app sees them as authenticated for onboarding.
  await revalidateSession()
  return { role: data.role ?? "student", onboarded: Boolean(data.onboarded) }
}

/** Re-send the verification email for the signed-in user. */
