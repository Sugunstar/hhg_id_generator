/**
 * HH Goa 2026 — Builder ID Card Configuration
 * ─────────────────────────────────────────────
 * Tweak layout, sizes, colours, and brand positioning from this single file.
 * All values are in logical (CSS) pixels — the canvas DPR scaling is handled
 * automatically in app.js so you never need to worry about it here.
 */

const CARD_CONFIG = {

  // ── Canvas ──────────────────────────────────────────────────
  canvas: {
    width: 1200,       // logical width  (exported PNG = width × renderScale)
    height: 500,        // logical height
    minRenderScale: 1,   // minimum backing-store multiplier
    maxRenderScale: 3,   // cap for high-DPI screens (3600×1500 export)
  },

  // ── Photo Circle Badge ──────────────────────────────────────
  photo: {
    radius: 205,       // circle radius
    centerX: 240,       // horizontal center
    // centerY is auto-calculated as canvas.height / 2
  },

  // ── Concentric Rings around the photo badge ─────────────────
  rings: {
    outer: { offset: 12, color: '#2E7D75', lineWidth: 2.5 },
    middle: { offset: 7, color: '#4A5D45', lineWidth: 1.5 },
    inner: { offset: 3, color: '#F4642A', lineWidth: 2 },
  },

  // ── Sunburst Rays ───────────────────────────────────────────
  sunburst: {
    count: 40,
    innerOffset: 14,    // starts this many px outside the photo radius
    outerOffset: 32,    // ends this many px outside the photo radius
  },

  // ── Details Panel (rounded rectangle) ───────────────────────
  panel: {
    x: 465,
    y: 150,
    // width is auto-calculated as canvas.width - x - marginRight
    marginRight: 30,
    height: 220,
    radius: 16,        // corner radius
    fillColor: 'rgba(18, 40, 33, 0.95)',
    borderColor: '#2E7D75',
    borderWidth: 2,
    // Inner accent border
    innerBorderColor: 'rgba(242, 235, 221, 0.10)',
    innerBorderWidth: 1,
    innerInset: 4,      // how far inward the inner accent border sits
  },

  // ── Card Outer Border ───────────────────────────────────────
  outerBorder: {
    color: '#000000',
    lineWidth: 4,
    inset: 2,       // how far from edge
  },

  // ── Text (Left Side of Panel) ──────────────────────────────
  text: {
    offsetX: 25,       // from panel left edge
    maxWidth: 375,      // max name text width before truncation

    eyebrow: {
      font: '500 11px "JetBrains Mono", monospace',
      color: '#3BAFA4',
      spacing: '3px',
      offsetY: 20,      // from panel top
      label: 'HH GOA 2026  ·  BUILDER ID',
    },

    name: {
      font: '800 42px "Bricolage Grotesque", sans-serif',
      color: '#FFFFFF',
      offsetY: 45,
    },

    stack: {
      font: '500 19px "Inter", sans-serif',
      color: '#E0D8C5',
      offsetY: 104,
    },

    accentLine: {
      offsetY: 138,
      width: 180,
      color: '#2E7D75',
      lineWidth: 1.5,
    },

    builderTitle: {
      font: '700 24px "Bricolage Grotesque", sans-serif',
      color: '#F4642A',
      offsetY: 155,
      prefix: '» ',
    },

    decorativeDots: {
      offsetY: 215,
      count: 7,
    },
  },

  // ── Brand Section (HACKER · GOA · HOUSE) ───────────────────
  brand: {
    centerOffsetX: 530, // from panel left edge
    rotation: -8,  // degrees (negative = anticlockwise)

    hacker: {           // p1.png — "HACKER" wordmark
      width: 270,
      // height auto-calculated from aspect ratio (237/624)
      offsetX: -10,    // nudge from center
      offsetY: -48,    // gap above center
    },

    goaHindi: {         // goa_hindi.svg
      width: 155,
      height: 154,
      offsetX: 5,
      offsetY: -5,
    },

    house: {            // p2.png — "HOUSE" wordmark
      width: 230,
      // height auto-calculated from aspect ratio (237/513)
      offsetX: 5,
      offsetY: 48,     // gap below center
    },
  },

  // ── Background ──────────────────────────────────────────────
  background: {
    fallbackColor: '#0C1E1A',
    overlayColor: 'rgba(12, 30, 26, 0.65)',
    ambientGlow: {
      color: 'rgba(46, 125, 117, 0.3)',
      radius: 600,
    },
  },
};
