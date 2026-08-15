/**
 * HH Goa 2026 — Builder ID Card Generator
 * Core application: photo handling, Canvas rendering, download, share.
 */

(function () {
  'use strict';

  // ── Constants (pulled from card-config.js) ─────────────────
  const CC = CARD_CONFIG;
  const CANVAS_W       = CC.canvas.width;
  const CANVAS_H       = CC.canvas.height;
  const PHOTO_RADIUS   = CC.photo.radius;
  const PHOTO_CX       = CC.photo.centerX;
  const PHOTO_CY       = CANVAS_H / 2;
  const TEXT_X         = 510;
  const MIN_RENDER_SCALE = CC.canvas.minRenderScale;
  const MAX_DPR        = CC.canvas.maxRenderScale;

  // Helper to get asset data URI (avoids canvas tainting on file://)
  function getAssetSrc(filename, defaultPath) {
    if (typeof ASSETS_DATA !== 'undefined' && ASSETS_DATA[filename]) {
      return ASSETS_DATA[filename];
    }
    return defaultPath;
  }

  // Preload Goa Beach Background & HH Brand Assets
  const goaBg = new Image();
  goaBg.onload = () => renderCard();
  goaBg.src = getAssetSrc('goa-beach-bg.png', 'assets/goa-beach-bg.png');

  const hhP1 = new Image();
  hhP1.onload = () => renderCard();
  hhP1.src = getAssetSrc('Hacker house p1.png', 'assets/Hacker house p1.png');

  const hhP2 = new Image();
  hhP2.onload = () => renderCard();
  hhP2.src = getAssetSrc('Hacker house p2.png', 'assets/Hacker house p2.png');

  const goaHindi = new Image();
  goaHindi.onload = () => renderCard();
  goaHindi.src = getAssetSrc('goa_hindi.svg', 'assets/goa_hindi.svg');

  // ── DOM refs (set in init) ─────────────────────────────────
  let fileInput, nameInput, stackInput;
  let canvas, ctx;
  let btnDownload, btnShare, heicNotice;
  let cardWrapper, backdropOverlay;
  let uploadedImage = null;  // HTMLImageElement of the processed photo

  // ── Card Interaction State Management ────────────────────
  let isMouseDownInsideCard = false;
  let isEditing = false;
  let debouncedRenderTimer = null;
  let pendingAnimationFrame = null;

  function focusCard(targetInput) {
    if (cardWrapper) cardWrapper.classList.add('is-focused');
    if (targetInput && typeof targetInput.focus === 'function' && document.activeElement !== targetInput) {
      targetInput.focus();
    }
  }

  function unfocusCard() {
    if (cardWrapper) cardWrapper.classList.remove('is-focused');
    if (document.activeElement && (document.activeElement === nameInput || document.activeElement === stackInput)) {
      document.activeElement.blur();
    }
  }

  // ── Init ───────────────────────────────────────────────────
  function init() {
    // Grab DOM elements
    fileInput           = document.getElementById('file-input');
    nameInput           = document.getElementById('name-input');
    stackInput          = document.getElementById('stack-input');
    canvas              = document.getElementById('card-canvas');
    ctx                 = canvas.getContext('2d');
    btnDownload         = document.getElementById('btn-download');
    btnShare            = document.getElementById('btn-share');
    heicNotice          = document.getElementById('heic-notice');
    cardWrapper         = document.getElementById('card-wrapper');
    backdropOverlay     = document.getElementById('backdrop-overlay');

    const photoHotspot  = document.getElementById('photo-click-zone');

    setupCanvasForDPR();

    // ── Track mousedown origin to prevent accidental unfocus during card transform ──
    document.addEventListener('mousedown', (e) => {
      if (cardWrapper && cardWrapper.contains(e.target)) {
        isMouseDownInsideCard = true;
      } else {
        isMouseDownInsideCard = false;
      }
    });

    // ── Slanted Card Focus & Edit Interaction ─────────────
    if (cardWrapper) {
      cardWrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        focusCard();
      });
    }

    if (nameInput) {
      nameInput.addEventListener('focus', () => focusCard(nameInput));
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          unfocusCard();
        }
      });
      nameInput.addEventListener('input', scheduleFastRender);
    }

    if (stackInput) {
      stackInput.addEventListener('focus', () => focusCard(stackInput));
      stackInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          unfocusCard();
        }
      });
      stackInput.addEventListener('input', scheduleFastRender);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') unfocusCard();
    });

    document.addEventListener('click', (e) => {
      if (isMouseDownInsideCard) {
        isMouseDownInsideCard = false;
        return;
      }
      if (
        cardWrapper &&
        !cardWrapper.contains(e.target) &&
        backdropOverlay &&
        backdropOverlay.classList.contains('is-active') &&
        !e.target.closest('.action-buttons')
      ) {
        unfocusCard();
      }
    });

    // ── Photo & Input Events ──────────────────────────────
    // Photo hotspot click → trigger hidden file input
    if (photoHotspot) {
      photoHotspot.addEventListener('click', (e) => {
        e.stopPropagation();
        focusCard();
        fileInput.click();
      });
    }

    // File input change
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handlePhoto(e.target.files[0]);
    });

    // Download & Share
    btnDownload.addEventListener('click', downloadCard);
    btnShare.addEventListener('click', shareToX);

    // Update clock
    updateClock();
    setInterval(updateClock, 60000);

    // Font gating helper to ensure canvas never paints before local fonts load
    async function ensureFontsLoaded() {
      if (!document.fonts) return;
      try {
        const fontSpecs = [
          '800 38px "Bricolage Grotesque"',
          '700 20px "Bricolage Grotesque"',
          '600 16px "Bricolage Grotesque"',
          '500 18px "Inter"',
          '400 14px "Inter"',
          '500 11px "JetBrains Mono"'
        ];
        await Promise.all(fontSpecs.map(spec => document.fonts.load(spec).catch(() => [])));
        await document.fonts.ready;
      } catch (e) {
        console.warn('Font loading check warning:', e);
      }
    }

    // Initial render gated behind font readiness
    ensureFontsLoaded().then(() => renderCard());
    renderCard();

    // Re-sync backing-store resolution if devicePixelRatio changes
    window.addEventListener('resize', debounce(() => {
      if (setupCanvasForDPR()) {
        renderCard();
      }
    }, 200));
  }

  // ── High-DPI canvas setup & Render Decoupling ─────────────────
  function setupCanvasForDPR() {
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, MIN_RENDER_SCALE), MAX_DPR);
    const targetW = Math.round(CANVAS_W * dpr);
    const targetH = Math.round(CANVAS_H * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width  = targetW;
      canvas.height = targetH;
      canvas._dpr = dpr;
      return true;
    }
    return false;
  }

  let renderScheduled = false;
  function scheduleFastRender() {
    if (!renderScheduled) {
      renderScheduled = true;
      requestAnimationFrame(() => {
        renderCard();
        renderScheduled = false;
      });
    }
  }

  // ── Clock ──────────────────────────────────────────────────
  function updateClock() {
    const el = document.getElementById('live-clock');
    if (!el) return;
    const now = new Date();
    const h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    el.textContent = `${h12}:${m} ${ampm} · HH GOA 2026`;
  }

  // ── Photo handling ─────────────────────────────────────────
  async function handlePhoto(file) {
    const name = file.name.toLowerCase();
    const isHEIC = name.endsWith('.heic') || name.endsWith('.heif') ||
                   file.type === 'image/heic' || file.type === 'image/heif';

    let blob = file;

    if (isHEIC) {
      heicNotice.classList.add('visible');
      heicNotice.textContent = 'CONVERTING HEIC → JPEG…';
      try {
        if (typeof heic2any === 'undefined') {
          throw new Error('HEIC library not loaded');
        }
        const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
        blob = Array.isArray(result) ? result[0] : result;
        heicNotice.textContent = 'HEIC CONVERTED ✓';
        setTimeout(() => heicNotice.classList.remove('visible'), 2000);
      } catch (err) {
        console.error('HEIC conversion error:', err);
        heicNotice.textContent = 'HEIC CONVERSION FAILED — TRY JPG/PNG';
        return;
      }
    } else {
      heicNotice.classList.remove('visible');
    }

    // Load into image via FileReader (base64 Data URL avoids any origin/taint issues)
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        uploadedImage = img;
        renderCard();
      };
      img.onerror = () => {
        alert('Could not load this image. Please try another file.');
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(blob);
  }

  // ── Canvas rendering ───────────────────────────────────────
  function renderCard() {
    const rawName    = nameInput ? nameInput.value.trim() : '';
    const rawStack   = stackInput ? stackInput.value.trim() : '';

    const isNameCustom  = rawName.length > 0;
    const isStackCustom = rawStack.length > 0;

    const bTitle     = generateBuilderTitle(isStackCustom ? rawStack : 'Full-stack / Dev');

    const now        = new Date();
    const h          = now.getHours() % 12 || 12;
    const m          = String(now.getMinutes()).padStart(2, '0');
    const ampm       = now.getHours() >= 12 ? 'PM' : 'AM';
    const timestamp  = `${h}:${m} ${ampm} · HH GOA 2026`;

    const dpr = canvas._dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // ── 1. Goa Beach Background Illustration ──────────────────
    if (goaBg.complete && goaBg.naturalWidth !== 0) {
      ctx.drawImage(goaBg, 0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = 'rgba(12, 30, 26, 0.65)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    } else {
      ctx.fillStyle = '#0C1E1A';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // Radial ocean green ambient glow
    const bgGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 600);
    bgGrad.addColorStop(0, 'rgba(46, 125, 117, 0.3)');
    bgGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ── 2. Card outer border ──────────────────────────────────
    const ob = CC.outerBorder;
    ctx.strokeStyle = ob.color;
    ctx.lineWidth = ob.lineWidth;
    ctx.strokeRect(ob.inset, ob.inset, CANVAS_W - ob.inset * 2, CANVAS_H - ob.inset * 2);

    // ── 3. Participant Details Box ────────────────────────────
    const pnl = CC.panel;
    const panelX = pnl.x;
    const panelY = pnl.y;
    const panelW = CANVAS_W - panelX - pnl.marginRight;
    const panelH = pnl.height;
    const panelRadius = pnl.radius;

    drawRoundRect(panelX, panelY, panelW, panelH, panelRadius, pnl.fillColor, pnl.borderColor, pnl.borderWidth);
    const ii = pnl.innerInset;
    drawRoundRect(panelX + ii, panelY + ii, panelW - ii * 2, panelH - ii * 2, panelRadius - 3, null, pnl.innerBorderColor, pnl.innerBorderWidth);

    // ── 4. Enlarged Circle Badge (Left Side) ────────────────
    drawSunburstRays();

    for (const ring of [CC.rings.outer, CC.rings.middle, CC.rings.inner]) {
      ctx.beginPath();
      ctx.arc(PHOTO_CX, PHOTO_CY, PHOTO_RADIUS + ring.offset, 0, Math.PI * 2);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.lineWidth;
      ctx.stroke();
    }

    drawCircularPhoto();

    // ── 5. Left Side: Participant Details ───────────────────
    const t = CC.text;
    const textX = panelX + t.offsetX;
    const textMaxW = t.maxWidth;

    // Eyebrow
    ctx.font = t.eyebrow.font;
    ctx.fillStyle = t.eyebrow.color;
    ctx.letterSpacing = t.eyebrow.spacing;
    ctx.textBaseline = 'top';
    ctx.fillText(t.eyebrow.label, textX, panelY + t.eyebrow.offsetY);
    ctx.letterSpacing = '0px';

    // Name (Only draw on canvas if user typed custom text; HTML overlay handles placeholder)
    if (isNameCustom) {
      ctx.font = t.name.font;
      ctx.fillStyle = t.name.color;
      ctx.textBaseline = 'top';
      let displayName = rawName;
      while (ctx.measureText(displayName).width > textMaxW && displayName.length > 1) {
        displayName = displayName.slice(0, -1);
      }
      if (displayName !== rawName) displayName += '…';
      ctx.fillText(displayName, textX, panelY + t.name.offsetY);
    }

    // Stack / Role (Only draw on canvas if user typed custom text; HTML overlay handles placeholder)
    if (isStackCustom) {
      ctx.font = t.stack.font;
      ctx.fillStyle = t.stack.color;
      ctx.textBaseline = 'top';
      ctx.fillText(rawStack, textX, panelY + t.stack.offsetY);
    }

    // Accent line
    ctx.beginPath();
    ctx.moveTo(textX, panelY + t.accentLine.offsetY);
    ctx.lineTo(textX + t.accentLine.width, panelY + t.accentLine.offsetY);
    ctx.strokeStyle = t.accentLine.color;
    ctx.lineWidth = t.accentLine.lineWidth;
    ctx.stroke();

    // Builder title
    ctx.font = t.builderTitle.font;
    ctx.fillStyle = t.builderTitle.color;
    ctx.fillText(t.builderTitle.prefix + bTitle, textX, panelY + t.builderTitle.offsetY);

    // Thin decorative dots
    drawDecoativeDots(textX, panelY + t.decorativeDots.offsetY, t.decorativeDots.count);

    // ── 6. Right Side: HH Goa Brand — enlarged, rotated ─────
    // Drawn AFTER the border so it visually sits on top,
    // hiding the card outline where it overflows the edge.
    drawBrandSection(panelX, panelY, panelH);
  }

  // ── Brand section (HACKER · GOA · HOUSE) — rotated & oversized ──
  function drawBrandSection(panelX, panelY, panelH) {
    const b = CC.brand;
    const brandCenterX = panelX + b.centerOffsetX;
    const brandCenterY = panelY + panelH / 2;
    const rotation = b.rotation * (Math.PI / 180);

    ctx.save();
    ctx.translate(brandCenterX, brandCenterY);
    ctx.rotate(rotation);

    // Top: HACKER (P1)
    if (hhP1.complete && hhP1.naturalWidth !== 0) {
      const p1W = b.hacker.width;
      const p1H = (p1W * 237) / 624;
      ctx.drawImage(hhP1, -p1W / 2 + b.hacker.offsetX, -p1H + b.hacker.offsetY, p1W, p1H);
    }

    // HOUSE (P2) — drawn BEFORE GOA so GOA appears on top
    if (hhP2.complete && hhP2.naturalWidth !== 0) {
      const p2W = b.house.width;
      const p2H = (p2W * 237) / 513;
      ctx.drawImage(hhP2, -p2W / 2 + b.house.offsetX, b.house.offsetY, p2W, p2H);
    }

    // GOA HINDI SVG — drawn last so it's on top of HOUSE
    if (goaHindi.complete && goaHindi.naturalWidth !== 0) {
      const gW = b.goaHindi.width;
      const gH = b.goaHindi.height;
      ctx.drawImage(goaHindi, -gW / 2 + b.goaHindi.offsetX, -gH / 2 + b.goaHindi.offsetY, gW, gH);
    }

    ctx.restore();
  }

  // ── Sunburst rays ──────────────────────────────────────────
  function drawSunburstRays() {
    const numRays = CC.sunburst.count;
    const innerR = PHOTO_RADIUS + CC.sunburst.innerOffset;
    const outerR = PHOTO_RADIUS + CC.sunburst.outerOffset;

    for (let i = 0; i < numRays; i++) {
      const angle = (Math.PI * 2 / numRays) * i;
      const x1 = PHOTO_CX + Math.cos(angle) * innerR;
      const y1 = PHOTO_CY + Math.sin(angle) * innerR;
      const x2 = PHOTO_CX + Math.cos(angle) * outerR;
      const y2 = PHOTO_CY + Math.sin(angle) * outerR;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      if (i % 3 === 0) {
        ctx.strokeStyle = 'rgba(244, 100, 42, 0.75)';
        ctx.lineWidth = 2.5;
      } else if (i % 2 === 0) {
        ctx.strokeStyle = 'rgba(46, 125, 117, 0.85)';
        ctx.lineWidth = 1.5;
      } else {
        ctx.strokeStyle = 'rgba(74, 93, 69, 0.65)';
        ctx.lineWidth = 1;
      }
      ctx.stroke();
    }
  }

  // ── Circular photo ─────────────────────────────────────────
  function drawCircularPhoto() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(PHOTO_CX, PHOTO_CY, PHOTO_RADIUS, 0, Math.PI * 2);
    ctx.clip();

    if (uploadedImage) {
      const img = uploadedImage;
      // Center-crop to square
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;

      ctx.drawImage(img, sx, sy, size, size,
        PHOTO_CX - PHOTO_RADIUS, PHOTO_CY - PHOTO_RADIUS,
        PHOTO_RADIUS * 2, PHOTO_RADIUS * 2);
    } else {
      // Default placeholder photo badge state: dark emerald fill + subtle builder avatar outline
      ctx.fillStyle = '#142C26';
      ctx.fillRect(PHOTO_CX - PHOTO_RADIUS, PHOTO_CY - PHOTO_RADIUS, PHOTO_RADIUS * 2, PHOTO_RADIUS * 2);
      
      // Subtle head avatar silhouette
      ctx.fillStyle = 'rgba(242, 235, 221, 0.15)';
      ctx.beginPath();
      ctx.arc(PHOTO_CX, PHOTO_CY - 30, 55, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(PHOTO_CX, PHOTO_CY + 130, 120, 0, Math.PI * 2);
      ctx.fill();

      // Camera icon hint badge
      ctx.fillStyle = 'rgba(12, 30, 26, 0.7)';
      ctx.beginPath();
      ctx.arc(PHOTO_CX, PHOTO_CY, 32, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#F4642A';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(PHOTO_CX - 15, PHOTO_CY - 10, 30, 20);
      ctx.beginPath();
      ctx.arc(PHOTO_CX, PHOTO_CY, 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── Decorative dots ────────────────────────────────────────
  function drawDecoativeDots(x, y, count) {
    for (let i = 0; i < count; i++) {
      ctx.beginPath();
      ctx.arc(x + i * 12, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(46, 125, 117, ${0.2 + (i * 0.1)})`;
      ctx.fill();
    }
  }

  // ── Rounded Rectangle Helper ──────────────────────────────
  function drawRoundRect(x, y, w, h, r, fillStyle, strokeStyle, strokeWidth) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle && strokeWidth) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
  }

  // ── Download (Bug 2 fix) ─────────────────────────────────────
  // The old implementation relied on an <a download> anchor as the primary
  // save path. iOS Safari — and most in-app browsers (Instagram/X/TikTok/
  // LinkedIn webviews, etc.) — silently ignore the `download` attribute for
  // data: and blob: URLs: instead of saving, they just navigate to/open the
  // image in a new tab, with no error thrown, which is exactly the "I have
  // to save it manually" symptom.
  //
  // Fix: on environments known to ignore `download`, use the Web Share sheet
  // (navigator.share with a File) as the PRIMARY path instead — it gives the
  // user a native "Save Image" action that actually persists the file. The
  // <a download> anchor remains the primary path everywhere else (desktop
  // Chrome/Firefox/Edge, standard Android Chrome), since it works fine there
  // and doesn't interrupt the user with a share sheet.
  //
  // IMPORTANT — user-activation gotcha: browsers only allow navigator.share()
  // and (reliably) window.open() to be called while there is still an active
  // "user gesture" from the click that triggered them. canvas.toBlob() is
  // ASYNCHRONOUS — by the time its callback fires (even a tick later), Safari
  // in particular has already expired that gesture, so navigator.share()
  // throws NotAllowedError and the whole thing silently falls through/fails.
  // That was the actual reason the button still didn't work after the first
  // fix. The blob must be produced SYNCHRONOUSLY (via toDataURL, decoded to a
  // Blob in-line) so navigator.share()/window.open() are still called inside
  // the original click handler's synchronous execution.
  function isUnreliableDownloadEnv() {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS 13+ reports as "Macintosh" but has touch support
      (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
    // Common in-app browser signatures (Instagram, Facebook, X/Twitter,
    // LinkedIn, TikTok, Line, generic Android WebView "; wv)")
    const isInAppWebview = /FBAN|FBAV|Instagram|Twitter|LinkedInApp|Line\/|TikTok|; ?wv\)/i.test(ua);
    return isIOS || isInAppWebview;
  }

  // Synchronous canvas → Blob conversion (no toBlob callback / event-loop
  // gap), so it can be called directly inside a click handler and still be
  // followed by navigator.share() / window.open() without losing user
  // activation.
  function canvasToBlobSync(mimeType) {
    const dataUrl = canvas.toDataURL(mimeType);
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function downloadCard() {
    const fileName = 'hhgoa-builder-id.png';
    let blob;
    try {
      blob = canvasToBlobSync('image/png');
    } catch (err) {
      console.error('Could not read canvas as image:', err);
      alert('Could not generate the image. Please try again.');
      return;
    }

    if (isUnreliableDownloadEnv()) {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // Called synchronously (no await before it) so it still counts as
        // being "in response to a user gesture" on iOS Safari.
        navigator.share({ files: [file] }).catch((err) => {
          if (err.name === 'AbortError') return; // user cancelled
          console.warn('Web Share failed, falling back to opening image in a new tab:', err);
          openImageForManualSave(blob);
        });
        return;
      }
      // Last resort on iOS/in-app browsers without file-share support:
      // open the image directly so the user can long-press → Save Image.
      openImageForManualSave(blob);
      return;
    }

    downloadViaAnchor(blob, fileName);
  }

  function downloadViaAnchor(blob, fileName) {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      // Use dispatchEvent for more reliable triggering across browsers
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 2000);
    } catch (err) {
      console.error('Download error:', err);
      openImageForManualSave(blob);
    }
  }

  function openImageForManualSave(blob) {
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      alert('Could not auto-download. Please right-click or long-press the card image to save it.');
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  // ── Toast notification helper ───────────────────────────────
  function showToast(message) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 28px;
        left: 50%;
        transform: translateX(-50%) translateY(40px);
        background: #0D241F;
        color: #F2EBDD;
        border: 1px solid #F4642A;
        padding: 14px 24px;
        border-radius: 30px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 12px 32px rgba(0,0,0,0.6);
        z-index: 999999;
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
        opacity: 0;
        pointer-events: none;
        letter-spacing: 0.02em;
      `;
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 5000);
  }

  // ── Share to X (Clean Clipboard + Native Intent) ────────────
  async function shareToX() {
    const name = nameInput.value.trim() || 'Builder';
    const bTitle = generateBuilderTitle(stackInput.value.trim());
    const caption = `I'm ${name} — ${bTitle} 🚀\n\nReady to build at Hacker House Goa 2026! 🌊\n\n#FrameInGoa #HHGoa2026 #BuilderID`;
    const fileName = 'hhgoa-builder-id.png';

    let blob;
    try {
      blob = canvasToBlobSync('image/png');
    } catch (err) {
      console.error('Could not read canvas as image:', err);
      alert('Could not generate card image. Please try again.');
      return;
    }

    // 1. Mobile / Native OS Share Sheet (Attaches image file directly into native X app)
    if (blob && navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ text: caption, files: [file] });
          return;
        } catch (err) {
          if (err.name === 'AbortError') return; // User cancelled share sheet
        }
      }
    }

    // 2. Synchronous Clipboard Copy (Ensures image is in system clipboard for Ctrl+V / Cmd+V)
    let copied = false;
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);
        copied = true;
      } catch (err) {
        console.warn('Clipboard write failed:', err);
      }
    }

    // 3. Open clean X Intent (No external &url= param to prevent X upload.json MediaError)
    const encodedCaption = encodeURIComponent(caption);
    const intentUrl = `https://x.com/intent/post?text=${encodedCaption}`;

    window.open(intentUrl, '_blank', 'noopener,noreferrer');

    // 4. Show helpful feedback toast
    if (copied) {
      showToast('📋 Card image copied! Press Ctrl+V (or Cmd+V) in X to attach photo.');
    } else {
      showToast('Opening X composer...');
    }
  }

  // ── Helpers ────────────────────────────────────────────────
  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ── Boot ───────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();