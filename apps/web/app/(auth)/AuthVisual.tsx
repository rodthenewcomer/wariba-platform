import { productCopy } from '../../lib/product-copy';

/**
 * The brand side of the authentication screen.
 *
 * Everything here is drawn, not photographed and not fabricated. That is the
 * governing constraint: an auth screen is the first thing a prospective trader
 * sees, and it is exactly where platforms in this category reach for invented
 * equity curves, imaginary payout figures and stock photographs of people in
 * front of six monitors. WARIBA shows none of that, because a number on a
 * marketing surface that does not come from an account is a claim the product
 * has not earned.
 *
 * What is left is geometry: a price-grid abstraction, a path that reads as
 * market structure without asserting any instrument or period, and controlled
 * light. It says "this is a market instrument" without saying anything untrue.
 *
 * Drawn in SVG and CSS rather than shipped as an image so it stays sharp at
 * every density, costs no network request, and inherits the theme tokens
 * instead of freezing a palette into a PNG.
 */
export function AuthVisual() {
  return (
    <div
      aria-hidden="true"
      data-testid="auth-visual"
      className="relative hidden overflow-hidden bg-[color:var(--warix-canvas)] lg:block"
    >
      {/* Atmosphere: one cobalt light from the upper left, one restrained
          violet counterlight from below. Two sources, not five — depth comes
          from restraint, and a screen lit from every direction reads as flat. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 12% 8%, rgba(46,86,168,0.28) 0%, rgba(46,86,168,0) 58%),' +
            'radial-gradient(90% 70% at 88% 96%, rgba(92,74,168,0.18) 0%, rgba(92,74,168,0) 60%)',
        }}
      />

      {/* The price grid. Deliberately faint: it is the surface the composition
          sits on, not a chart the eye should try to read. */}
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 800 900"
      >
        <defs>
          <pattern id="wariba-auth-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M40 0H0V40"
              fill="none"
              stroke="var(--warix-border-subtle, #272D3A)"
              strokeOpacity="0.5"
              strokeWidth="1"
            />
          </pattern>
          <linearGradient id="wariba-auth-path" x1="0" x2="1" y1="1" y2="0">
            <stop offset="0%" stopColor="#2E56A8" stopOpacity="0.15" />
            <stop offset="55%" stopColor="#4E7FD6" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#8E7FD6" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="wariba-auth-fade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#4E7FD6" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#4E7FD6" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect width="800" height="900" fill="url(#wariba-auth-grid)" opacity="0.55" />

        {/*
         * A market-shaped path with no market attached.
         *
         * It has the cadence of price — impulses, retracements, a structure
         * that resolves upward — and carries no axis, no scale, no instrument
         * and no period, so it cannot be read as a performance claim. That
         * distinction is the whole point: the shape is evocative, the data is
         * absent, and nothing here implies a result anyone achieved.
         */}
        <path
          d="M-20 640 L60 604 L120 632 L184 548 L248 578 L316 470 L372 508 L436 402 L500 440 L566 330 L632 366 L700 268 L768 300 L830 232"
          fill="none"
          stroke="url(#wariba-auth-path)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        <path
          d="M-20 640 L60 604 L120 632 L184 548 L248 578 L316 470 L372 508 L436 402 L500 440 L566 330 L632 366 L700 268 L768 300 L830 232 L830 900 L-20 900 Z"
          fill="url(#wariba-auth-fade)"
        />

        {/* Three level lines. Structure, not annotation — no prices attached. */}
        <g stroke="#4E7FD6" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="5 9">
          <path d="M-20 470H830" />
          <path d="M-20 330H830" />
          <path d="M-20 190H830" />
        </g>
      </svg>

      {/* Identity and one sentence about what the platform is. No metric, no
          testimonial, no number — nothing that would need to be true. */}
      <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[color:var(--wariba-component-workstation-wash-identity)] text-[length:var(--wariba-font-size-heading-sm)] font-extrabold leading-none tracking-[-0.02em] text-[color:var(--wariba-component-workstation-identity-mark)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-identity-rule)]"
          >
            W
          </span>
          <span className="text-[length:var(--wariba-font-size-heading-sm)] font-bold tracking-[-0.01em] text-[color:var(--wariba-text-primary)]">
            {productCopy.auth.brand.name}
          </span>
        </div>

        <div className="max-w-[26rem]">
          <p className="text-[length:var(--wariba-font-size-heading-lg)] font-semibold leading-tight tracking-[-0.02em] text-[color:var(--wariba-text-primary)]">
            {productCopy.auth.brand.promise}
          </p>
          <p className="mt-3 text-[length:var(--wariba-font-size-body-md)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
            {productCopy.auth.brand.tagline}
          </p>
        </div>
      </div>

      {/* Seam against the form column, so the two surfaces read as one product
          rather than two panes butted together. */}
      <div className="absolute inset-y-0 right-0 w-px bg-[color:var(--warix-border-subtle)]" />
    </div>
  );
}
