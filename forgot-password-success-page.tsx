// /app/(auth)/forgot-password/success/page.tsx
"use client";

import Link from "next/link";

export default function ForgotPasswordSuccessPage() {
  return (
    <main className="relative min-h-screen bg-white flex items-center justify-center overflow-hidden px-4">

      {/* Watermark */}
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

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">

        {/* Logo */}
        <div className="mb-10 text-center">
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

        {/* Main Card */}
        <div
          className="bg-white rounded-2xl px-10 py-12 text-center"
          style={{
            boxShadow:
              "0 0 0 1px rgba(0,0,0,0.06), 0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 40px -8px rgba(0,0,0,0.08)",
          }}
        >
          {/* Hero Icon */}
          <div className="flex justify-center mb-8">
            <div
              className="relative flex items-center justify-center w-20 h-20 rounded-full"
              style={{ backgroundColor: "rgba(28,103,88,0.08)" }}
            >
              {/* Outer ring pulse */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  backgroundColor: "rgba(28,103,88,0.05)",
                  animation: "ping 2.5s cubic-bezier(0,0,0.2,1) infinite",
                }}
              />
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                {/* Envelope body */}
                <rect
                  x="4"
                  y="10"
                  width="32"
                  height="22"
                  rx="3"
                  stroke="#1C6758"
                  strokeWidth="2"
                  fill="none"
                />
                {/* Envelope flap / V */}
                <path
                  d="M4 13 L20 23 L36 13"
                  stroke="#1C6758"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                {/* Small check badge */}
                <circle cx="30" cy="11" r="7" fill="#1C6758" />
                <path
                  d="M27 11 L29.2 13.2 L33 9"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1
            className="mb-3 text-gray-900"
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: "26px",
              fontWeight: 700,
              letterSpacing: "-0.5px",
              lineHeight: 1.2,
            }}
          >
            Check your inbox
          </h1>

          {/* Body */}
          <p
            className="text-gray-500 mb-10 mx-auto"
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: "15px",
              lineHeight: "1.65",
              maxWidth: "320px",
            }}
          >
            We&apos;ve sent a password reset link to your email. Please check
            your spam folder if you don&apos;t see it within a few minutes.
          </p>

          {/* Divider */}
          <div
            className="mb-8 mx-auto"
            style={{
              height: "1px",
              backgroundColor: "rgba(0,0,0,0.07)",
              width: "100%",
            }}
          />

          {/* Return to Login Button */}
          <Link
            href="/login"
            className="group inline-flex items-center justify-center gap-2 w-full rounded-xl border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              fontFamily: "Arial, sans-serif",
              fontWeight: 600,
              fontSize: "15px",
              padding: "13px 24px",
              color: "#1C6758",
              borderColor: "rgba(28,103,88,0.3)",
              backgroundColor: "transparent",
              letterSpacing: "-0.2px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                "rgba(28,103,88,0.05)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor =
                "#1C6758";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                "transparent";
              (e.currentTarget as HTMLAnchorElement).style.borderColor =
                "rgba(28,103,88,0.3)";
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="transition-transform duration-200 group-hover:-translate-x-0.5"
            >
              <path
                d="M10 3L5 8L10 13"
                stroke="#1C6758"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Return to Login
          </Link>

          {/* Footer note */}
          <p
            className="mt-6 text-gray-400"
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: "13px",
              lineHeight: "1.5",
            }}
          >
            Didn&apos;t receive an email?{" "}
            <Link
              href="/forgot-password"
              className="transition-colors duration-150"
              style={{ color: "#1C6758" }}
            >
              Try again
            </Link>
          </p>
        </div>
      </div>

      {/* Ping animation keyframes */}
      <style jsx>{`
        @keyframes ping {
          75%,
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
      `}</style>
    </main>
  );
}
