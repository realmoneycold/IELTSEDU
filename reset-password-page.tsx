// /app/(auth)/reset-password/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

/* ─── tiny helpers ─── */
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 9C2.5 5 5.5 3 9 3C12.5 3 15.5 5 17 9C15.5 13 12.5 15 9 15C5.5 15 2.5 13 1 9Z" stroke="#9CA3AF" strokeWidth="1.5" fill="none"/>
      <circle cx="9" cy="9" r="2.5" stroke="#9CA3AF" strokeWidth="1.5" fill="none"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 9C2.5 5 5.5 3 9 3C12.5 3 15.5 5 17 9C15.5 13 12.5 15 9 15C5.5 15 2.5 13 1 9Z" stroke="#9CA3AF" strokeWidth="1.5" fill="none"/>
      <circle cx="9" cy="9" r="2.5" stroke="#9CA3AF" strokeWidth="1.5" fill="none"/>
      <line x1="2" y1="2" x2="16" y2="16" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function StrengthBar({ password }: { password: string }) {
  const calc = (p: string) => {
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };
  const score = password ? calc(password) : 0;
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Very strong"];
  const colors = ["", "#EF4444", "#F59E0B", "#3B82F6", "#1C6758", "#1C6758"];
  const widths = ["0%", "20%", "40%", "60%", "80%", "100%"];

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="w-full h-1 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: widths[score], backgroundColor: colors[score] }}
        />
      </div>
      <p
        className="mt-1 text-right"
        style={{
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          color: colors[score],
          transition: "color 0.3s",
        }}
      >
        {labels[score]}
      </p>
    </div>
  );
}

/* ─── main page ─── */
export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState({ new: false, confirm: false });

  const newRef = useRef<HTMLInputElement>(null);
  useEffect(() => { newRef.current?.focus(); }, []);

  const passwordsMatch =
    confirmPassword.length === 0 || newPassword === confirmPassword;
  const mismatch = touched.confirm && confirmPassword.length > 0 && newPassword !== confirmPassword;
  const isValid =
    newPassword.length >= 8 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    setIsLoading(false);
    setSuccess(true);
  };

  /* ── success state ── */
  if (success) {
    return (
      <main className="relative min-h-screen bg-white flex items-center justify-center overflow-hidden px-4">
        <Watermark />
        <div className="relative z-10 w-full max-w-md">
          <Logo />
          <div
            className="bg-white rounded-2xl px-10 py-12 text-center"
            style={{ boxShadow: CARD_SHADOW }}
          >
            <div className="flex justify-center mb-8">
              <div
                className="flex items-center justify-center w-20 h-20 rounded-full"
                style={{ backgroundColor: "rgba(28,103,88,0.08)" }}
              >
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="16" stroke="#1C6758" strokeWidth="2" fill="none"/>
                  <path d="M13 20.5 L17.5 25 L27 15" stroke="#1C6758" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
            </div>
            <h1 className="mb-3 text-gray-900" style={headingStyle}>
              Password updated
            </h1>
            <p className="text-gray-500 mb-8 mx-auto" style={{ ...bodyStyle, maxWidth: "300px" }}>
              Your password has been changed successfully. You can now sign in with your new password.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full rounded-xl font-semibold transition-all duration-200"
              style={{ ...btnBaseStyle, backgroundColor: "#1C6758", color: "#fff", padding: "14px 24px" }}
            >
              Back to Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /* ── main form ── */
  return (
    <main className="relative min-h-screen bg-white flex items-center justify-center overflow-hidden px-4">
      <Watermark />

      <div className="relative z-10 w-full max-w-md">
        <Logo />

        {/* Card */}
        <div
          className="bg-white rounded-2xl px-10 py-11"
          style={{ boxShadow: CARD_SHADOW }}
        >
          {/* Lock icon */}
          <div className="flex justify-center mb-7">
            <div
              className="flex items-center justify-center w-14 h-14 rounded-2xl"
              style={{ backgroundColor: "rgba(28,103,88,0.08)" }}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="5" y="12" width="18" height="13" rx="3" stroke="#1C6758" strokeWidth="1.8" fill="none"/>
                <path d="M9 12V9a5 5 0 0 1 10 0v3" stroke="#1C6758" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                <circle cx="14" cy="18.5" r="1.5" fill="#1C6758"/>
                <line x1="14" y1="20" x2="14" y2="22" stroke="#1C6758" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          {/* Headings */}
          <h1 className="text-center text-gray-900 mb-1" style={headingStyle}>
            Set new password
          </h1>
          <p className="text-center text-gray-400 mb-8" style={{ ...bodyStyle, fontSize: "14px", maxWidth: "290px", margin: "0 auto 32px" }}>
            Your new password must be different from previously used passwords.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {/* New Password */}
            <div className="mb-5">
              <label htmlFor="new-password" style={labelStyle}>
                New Password
              </label>
              <div className="relative mt-1.5">
                <input
                  ref={newRef}
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, new: true }))}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                  required
                  className="w-full outline-none transition-all duration-200"
                  style={{
                    ...inputStyle,
                    borderColor:
                      touched.new && newPassword.length > 0 && newPassword.length < 8
                        ? "#EF4444"
                        : newPassword.length >= 8
                        ? "#1C6758"
                        : "#E5E7EB",
                    boxShadow:
                      newPassword.length >= 8
                        ? "0 0 0 3px rgba(28,103,88,0.08)"
                        : "none",
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity hover:opacity-70"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showNew} />
                </button>
              </div>
              <StrengthBar password={newPassword} />
              {touched.new && newPassword.length > 0 && newPassword.length < 8 && (
                <p className="mt-1.5" style={{ ...errorStyle }}>
                  Password must be at least 8 characters
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="mb-7">
              <label htmlFor="confirm-password" style={labelStyle}>
                Confirm New Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                  className="w-full outline-none transition-all duration-200"
                  style={{
                    ...inputStyle,
                    borderColor: mismatch
                      ? "#EF4444"
                      : confirmPassword.length > 0 && !mismatch && confirmPassword === newPassword
                      ? "#1C6758"
                      : "#E5E7EB",
                    boxShadow:
                      confirmPassword.length > 0 && !mismatch && confirmPassword === newPassword
                        ? "0 0 0 3px rgba(28,103,88,0.08)"
                        : "none",
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity hover:opacity-70"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {mismatch && (
                <p className="mt-1.5" style={errorStyle}>
                  Passwords do not match
                </p>
              )}
              {!mismatch && confirmPassword.length > 0 && confirmPassword === newPassword && (
                <p className="mt-1.5" style={{ ...errorStyle, color: "#1C6758" }}>
                  ✓ Passwords match
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isValid || isLoading}
              className="w-full rounded-xl font-semibold flex items-center justify-center gap-2.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                ...btnBaseStyle,
                padding: "14px 24px",
                backgroundColor: isValid ? "#1C6758" : "#D1D5DB",
                color: isValid ? "#fff" : "#9CA3AF",
                cursor: isValid && !isLoading ? "pointer" : "not-allowed",
                transform: isLoading ? "scale(0.99)" : "scale(1)",
              }}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin"
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="9" cy="9" r="7" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                    <path d="M9 2 A7 7 0 0 1 16 9" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Updating password…
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </form>

          {/* Footer link */}
          <p className="mt-6 text-center" style={{ fontFamily: "Arial, sans-serif", fontSize: "13px", color: "#9CA3AF" }}>
            Remember it?{" "}
            <Link
              href="/login"
              className="transition-colors duration-150"
              style={{ color: "#1C6758", fontWeight: 600 }}
            >
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

/* ─── shared sub-components ─── */
function Watermark() {
  return (
    <div
      className="pointer-events-none select-none absolute inset-0 flex items-center justify-center"
      aria-hidden="true"
    >
      <span
        style={{
          fontSize: "72px",
          opacity: 0.03,
          transform: "rotate(-20deg)",
          fontFamily: "Arial, sans-serif",
          fontWeight: 700,
          letterSpacing: "0.1em",
          whiteSpace: "nowrap",
          color: "#000000",
          userSelect: "none",
        }}
      >
        IELTSPRACTICE
      </span>
    </div>
  );
}

function Logo() {
  return (
    <div className="mb-8 text-center">
      <span
        style={{
          fontFamily: "Arial, sans-serif",
          fontWeight: 700,
          fontSize: "24px",
          color: "#333333",
          letterSpacing: "-0.5px",
        }}
      >
        IELTS
      </span>
    </div>
  );
}

/* ─── shared style tokens ─── */
const CARD_SHADOW =
  "0 0 0 1px rgba(0,0,0,0.06), 0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 40px -8px rgba(0,0,0,0.08)";

const headingStyle: React.CSSProperties = {
  fontFamily: "Arial, sans-serif",
  fontSize: "26px",
  fontWeight: 700,
  letterSpacing: "-0.5px",
  lineHeight: 1.2,
};

const bodyStyle: React.CSSProperties = {
  fontFamily: "Arial, sans-serif",
  fontSize: "15px",
  lineHeight: "1.65",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "Arial, sans-serif",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
  letterSpacing: "-0.1px",
};

const inputStyle: React.CSSProperties = {
  fontFamily: "Arial, sans-serif",
  fontSize: "15px",
  color: "#111827",
  backgroundColor: "#FAFAFA",
  border: "1.5px solid #E5E7EB",
  borderRadius: "10px",
  padding: "12px 44px 12px 14px",
  width: "100%",
};

const errorStyle: React.CSSProperties = {
  fontFamily: "Arial, sans-serif",
  fontSize: "12.5px",
  color: "#EF4444",
};

const btnBaseStyle: React.CSSProperties = {
  fontFamily: "Arial, sans-serif",
  fontSize: "15px",
  fontWeight: 600,
  letterSpacing: "-0.2px",
  borderRadius: "12px",
  border: "none",
};
