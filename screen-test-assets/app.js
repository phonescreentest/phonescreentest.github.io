/* ========================================================================
   SCREEN TEST — application logic
   Sections:
     1. Test configuration (data)
     2. App state + persistence
     3. Selection screen (render + interactions)
     4. Modals
     5. Test runner (fullscreen flow)
     6. Renderers (one function per test "engine", reused across tests)
     7. Results screen
   ======================================================================== */

(function(){
"use strict";

/* Everything lives inside boot() and only runs once the page's HTML is
   actually in the DOM. This matters on WordPress because caching/JS-
   optimization plugins (defer, async, "delay JS execution", script
   combining) can run this file before the shortcode's markup is on
   the page — if that happens here, we simply wait instead of failing. */
function boot(){

  // If the shortcode markup isn't on this page for any reason, bail out
  // loudly in the console instead of throwing on the first missing element.
  if(!document.getElementById("category-screen")){
    console.warn("Screen Test: expected markup not found on this page — is the [screen_test] shortcode present?");
    return;
  }

/* ---------------------------------------------------------------------
   1. TEST CONFIGURATION
   Each test: { id, name, category, description, renderer, params, default }
--------------------------------------------------------------------- */
const CATEGORY_ORDER = [
  "Pixel & Display",
  "Color",
  "Brightness & Uniformity",
  "Touch",
  "Motion & Refresh",
  "Image Quality",
  "OLED & Panel Health",
  "Orientation"
];

const TESTS = [
  // ---------------- Pixel & Display ----------------
  { id:"test-pattern", name:"Test Pattern", category:"Pixel & Display",
    description:"Cycles through color bars, grayscale steps and a pixel grid in one pass — a quick first look at your panel before running individual tests.",
    renderer:"pattern", params:{variant:"testpattern"}, def:false },
  { id:"dead-pixel", name:"Dead Pixel Test", category:"Pixel & Display",
    description:"Displays solid colors edge-to-edge so you can look for pixels that stay black or don't display any color at all — a sign of a dead pixel.",
    renderer:"solid", params:{colors:["#FF0000","#00FF00","#0000FF","#FFFFFF","#000000"]}, def:true },
  { id:"stuck-pixel", name:"Stuck Pixel Test", category:"Pixel & Display",
    description:"Shows the same pure colors as the dead pixel test. Look for a pixel that stays lit in one color (often red, green or blue) no matter what's on screen — that's a stuck pixel, not a dead one.",
    renderer:"solid", params:{colors:["#000000","#FFFFFF","#FF0000","#00FF00","#0000FF"]}, def:true },
  { id:"sub-pixel", name:"Sub-Pixel Test", category:"Pixel & Display",
    description:"Zooms into thin repeating red, green and blue stripes so you can inspect individual sub-pixels for discoloration or damage.",
    renderer:"pattern", params:{variant:"subpixel"}, def:false },
  { id:"pixel-grid", name:"Pixel Grid", category:"Pixel & Display",
    description:"Displays a high-contrast one-pixel grid across the whole screen, useful for spotting alignment, scaling or panel-uniformity issues.",
    renderer:"pattern", params:{variant:"pixelgrid"}, def:false },
  { id:"white-screen", name:"White Screen", category:"Pixel & Display",
    description:"Fills the screen with pure white (#FFFFFF) — good for spotting dust, scratches, dead pixels and backlight uniformity issues.",
    renderer:"solid", params:{colors:["#FFFFFF"]}, def:true },
  { id:"black-screen", name:"Black Screen", category:"Pixel & Display",
    description:"Fills the screen with pure black (#000000) — the classic way to check for backlight bleed, light leakage and stuck sub-pixels.",
    renderer:"solid", params:{colors:["#000000"]}, def:true },
  { id:"red-screen", name:"Red Screen", category:"Pixel & Display",
    description:"Fills the screen with pure red (#FF0000) to help reveal dead or stuck pixels and red sub-pixel issues.",
    renderer:"solid", params:{colors:["#FF0000"]}, def:true },
  { id:"green-screen", name:"Green Screen", category:"Pixel & Display",
    description:"Fills the screen with pure green (#00FF00) — the color the human eye is most sensitive to, making pixel defects easiest to spot.",
    renderer:"solid", params:{colors:["#00FF00"]}, def:true },
  { id:"blue-screen", name:"Blue Screen", category:"Pixel & Display",
    description:"Fills the screen with pure blue (#0000FF) to help reveal dead or stuck pixels and blue sub-pixel issues.",
    renderer:"solid", params:{colors:["#0000FF"]}, def:true },
  { id:"gray-screen", name:"Gray Screen", category:"Pixel & Display",
    description:"Cycles through several flat gray levels. Gray makes uneven tint, dirty pixels and panel blemishes far more visible than white or black alone.",
    renderer:"solid", params:{colors:["#808080","#404040","#C0C0C0","#202020","#E0E0E0"]}, def:true },

  // ---------------- Color ----------------
  { id:"color-test", name:"Color Test", category:"Color",
    description:"Shows a full grid of saturated hues across the spectrum so you can check for color casts, dead pixels of a specific color, or panel-wide tint.",
    renderer:"colorSwatches", params:{mode:"hues"}, def:true },
  { id:"color-distances", name:"Color Distances", category:"Color",
    description:"Places subtly different, closely related colors side by side. If neighboring swatches look identical, your display may struggle with fine color separation.",
    renderer:"colorSwatches", params:{mode:"distances"}, def:false },
  { id:"color-accuracy", name:"Color Accuracy", category:"Color",
    description:"Displays familiar reference colors — skin tone, sky blue, grass green, warm white — so you can judge whether colors look natural rather than shifted.",
    renderer:"colorSwatches", params:{mode:"accuracy"}, def:false },
  { id:"gradients", name:"Gradients", category:"Color",
    description:"Shows smooth black-to-white and red/green/blue gradients. Tap to cycle. Look for smooth transitions rather than visible steps or color shifts.",
    renderer:"gradient", params:{variant:"multi"}, def:false },
  { id:"gradient-banding", name:"Gradient Banding", category:"Color",
    description:"A slow, wide grayscale gradient designed to expose banding — visible stripes where there should be a smooth transition, often caused by a limited color depth or poor scaling.",
    renderer:"gradient", params:{variant:"banding"}, def:false },
  { id:"contrast-test", name:"Contrast Test", category:"Color",
    description:"Displays adjoining black and white blocks at different sizes so you can judge how crisply your display separates the darkest and brightest tones.",
    renderer:"contrast", params:{}, def:true },
  { id:"gamma-test", name:"Gamma Test", category:"Color",
    description:"Shows striped patches next to flat gray reference patches at common gamma values. The patch where the stripes visually blend into the flat gray at a normal viewing distance indicates your display's gamma.",
    renderer:"gamma", params:{}, def:false },
  { id:"color-saturation", name:"Color Saturation Test", category:"Color",
    description:"Shows the same hues at increasing saturation levels, from washed-out to fully saturated, to help you judge color vibrancy and any clipping at high saturation.",
    renderer:"colorSwatches", params:{mode:"saturation"}, def:false },

  // ---------------- Brightness & Uniformity ----------------
  { id:"brightness-test", name:"Brightness Test", category:"Brightness & Uniformity",
    description:"Displays a row of gray steps from near-black to near-white so you can check that every brightness level is distinguishable from its neighbors.",
    renderer:"brightness", params:{}, def:true },
  { id:"brightness-uniformity", name:"Brightness Uniformity", category:"Brightness & Uniformity",
    description:"Fills the screen with flat white and overlays a faint grid so you can compare brightness across corners, edges and center for uneven backlighting.",
    renderer:"solid", params:{colors:["#FFFFFF"], overlayGrid:true}, def:false },
  { id:"screen-uniformity", name:"Screen Uniformity", category:"Brightness & Uniformity",
    description:"Cycles through gray, white and black full-screen fills to help you spot patchy or uneven areas across the whole panel.",
    renderer:"solid", params:{colors:["#808080","#FFFFFF","#000000"]}, def:true },
  { id:"gray-uniformity", name:"Gray Uniformity", category:"Brightness & Uniformity",
    description:"A flat mid-gray fill — the tone that most readily reveals tinting, blotches or panel unevenness that pure white or black can hide.",
    renderer:"solid", params:{colors:["#808080"], overlayGrid:true}, def:false },
  { id:"backlight-bleed", name:"Backlight Bleed Test", category:"Brightness & Uniformity",
    description:"Fills the screen with pure black. In a dark room, look for glowing patches near the edges or corners — a sign of backlight bleed on LCD panels.",
    renderer:"solid", params:{colors:["#000000"]}, def:true },
  { id:"light-leakage", name:"Light Leakage Test", category:"Brightness & Uniformity",
    description:"Similar to the backlight bleed test — a full black screen for inspecting light escaping around the bezel or edges of the panel in a dark room.",
    renderer:"solid", params:{colors:["#000000"]}, def:false },
  { id:"clouding-test", name:"Clouding Test", category:"Brightness & Uniformity",
    description:"Shows dark gray fills in a dim room, helping reveal 'clouding' — soft, uneven cloud-like patches of lighter backlight bleeding through dark scenes.",
    renderer:"solid", params:{colors:["#404040","#202020","#101010"]}, def:false },

  // ---------------- Touch ----------------
  { id:"touch-coverage", name:"Touch Coverage Test", category:"Touch",
    description:"Swipe your finger continuously across the whole grid — every cell it passes over turns green. Any cell left dark after a full pass may be a dead touch zone. Tap Reset to try again.",
    renderer:"touchGrid", params:{rows:8, cols:11, mode:"swipe", showReset:true}, def:true },
  { id:"touch-test", name:"Touch Test", category:"Touch",
    description:"Tap anywhere on the screen. Each tap leaves a mark so you can confirm the touch layer is registering input across the whole surface.",
    renderer:"touchZone", params:{variant:"basic"}, def:true },
  { id:"multi-touch", name:"Multi-Touch Test", category:"Touch",
    description:"Place several fingers on the screen at once. Each detected touch point is labeled (Finger 1, Finger 2...) so you can verify simultaneous multi-touch tracking.",
    renderer:"multiTouch", params:{}, def:false },
  { id:"touch-accuracy", name:"Touch Accuracy Test", category:"Touch",
    description:"Tap the center of each target as precisely as you can. Consistent offset between where you tap and where it registers suggests a touch calibration issue.",
    renderer:"touchZone", params:{variant:"accuracy"}, def:false },
  { id:"touch-sensitivity", name:"Touch Sensitivity Test", category:"Touch",
    description:"Try both light and firm taps across the screen. Note any areas that need extra pressure to register — browsers can't measure pressure directly, so this is a manual comparison.",
    renderer:"touchZone", params:{variant:"sensitivity"}, def:false },
  { id:"touch-grid", name:"Touch Grid Test", category:"Touch",
    description:"Tap every cell in the grid to find touch zones that don't respond. Tested cells turn green, and coordinates plus response time are shown for each tap.",
    renderer:"touchGrid", params:{rows:8, cols:5}, def:false },
  { id:"touch-line", name:"Touch Line Test", category:"Touch",
    description:"Drag your finger continuously across the entire screen. Gaps or jumps in the drawn line can reveal areas where touch tracking breaks down.",
    renderer:"touchLine", params:{}, def:false },
  { id:"edge-touch", name:"Edge Touch Test", category:"Touch",
    description:"Tap along the thin zones running down each edge of the screen — edges are the most common place for touch digitizers to lose accuracy.",
    renderer:"touchZone", params:{variant:"edge"}, def:false },
  { id:"corner-touch", name:"Corner Touch Test", category:"Touch",
    description:"Tap each of the four corner zones. Corners are especially prone to reduced touch sensitivity or dead zones on some devices.",
    renderer:"touchZone", params:{variant:"corner"}, def:false },
  { id:"dead-touch-zone", name:"Dead Touch Zone Test", category:"Touch",
    description:"A finer touch grid covering the full screen. Any cell that stays untested after you've tried tapping it may be a dead touch zone.",
    renderer:"touchGrid", params:{rows:12, cols:7}, def:false },
  { id:"ghost-touch", name:"Ghost Touch Test", category:"Touch",
    description:"Place the device down and don't touch the screen. This watches for touch events registering on their own — a possible sign of ghost touch. A browser can only observe and log this; it can't diagnose the hardware cause.",
    renderer:"touchZone", params:{variant:"ghost"}, def:false },
  { id:"touch-latency", name:"Touch Latency Test", category:"Touch",
    description:"Tap the target repeatedly. This measures the time between your tap event and the next rendered frame — an approximate, browser-level figure, not a hardware latency measurement.",
    renderer:"touchZone", params:{variant:"latency"}, def:false },

  // ---------------- Motion & Refresh ----------------
  { id:"refresh-rate", name:"Refresh Rate Test", category:"Motion & Refresh",
    description:"Runs a smooth animation and measures frames rendered per second using the browser's own timing. This is an approximate software estimate, not an exact hardware Hz reading.",
    renderer:"motion", params:{variant:"refresh"}, def:true },
  { id:"motion-test", name:"Motion Test", category:"Motion & Refresh",
    description:"Moves a high-contrast object smoothly across the screen so you can visually judge how fluid motion looks on your display.",
    renderer:"motion", params:{variant:"basic"}, def:false },
  { id:"ghosting-test", name:"Ghosting Test", category:"Motion & Refresh",
    description:"Moves a sharp-edged shape quickly across a contrasting background. A trailing shadow behind it can indicate pixel response ghosting.",
    renderer:"motion", params:{variant:"ghosting"}, def:false },
  { id:"motion-blur", name:"Motion Blur Test", category:"Motion & Refresh",
    description:"Similar fast-moving pattern to the ghosting test, focused on judging overall blur during motion rather than a single trailing edge.",
    renderer:"motion", params:{variant:"blur"}, def:false },
  { id:"frame-skipping", name:"Frame Skipping Test", category:"Motion & Refresh",
    description:"Displays a moving pattern with a live measured frame-rate counter, so stutters or dropped frames are both visible and roughly quantified.",
    renderer:"motion", params:{variant:"frames"}, def:false },
  { id:"response-time", name:"Response Time Test", category:"Motion & Refresh",
    description:"Alternates a fast-moving black/white edge so you can visually inspect for smearing or trailing associated with slow pixel response time.",
    renderer:"motion", params:{variant:"response"}, def:false },

  // ---------------- Image Quality ----------------
  { id:"sharpness-test", name:"Sharpness Test", category:"Image Quality",
    description:"Shows a radial star-burst pattern of fine lines converging at the center — a classic way to judge sharpness and detect scaling blur.",
    renderer:"pattern", params:{variant:"sharpness"}, def:false },
  { id:"resolution-test", name:"Resolution Test", category:"Image Quality",
    description:"Shows a fine 1-pixel checkerboard alongside your browser-reported screen resolution and pixel ratio, to help confirm your display is running at its native resolution.",
    renderer:"pattern", params:{variant:"resolution"}, def:false },
  { id:"viewing-angle", name:"Viewing Angle Test", category:"Image Quality",
    description:"Displays high-contrast color bands. View the screen from different angles — left, right, above and below — and note where colors shift or wash out.",
    renderer:"viewingAngle", params:{}, def:false },
  { id:"moire-test", name:"Moiré Pattern Test", category:"Image Quality",
    description:"Displays fine repeating diagonal lines, which can reveal moiré interference patterns caused by scaling or panel-pitch mismatches.",
    renderer:"pattern", params:{variant:"moire"}, def:false },
  { id:"checkerboard-test", name:"Checkerboard Test", category:"Image Quality",
    description:"An alternating black-and-white checkerboard, useful for spotting scaling artifacts, uneven pixels or sharpening halos.",
    renderer:"pattern", params:{variant:"checkerboard"}, def:false },
  { id:"fine-lines-test", name:"Fine Lines Test", category:"Image Quality",
    description:"Shows sets of 1px, 2px and 3px lines in both orientations so you can judge how crisply your display renders fine detail.",
    renderer:"pattern", params:{variant:"fineLines"}, def:false },
  { id:"text-sharpness", name:"Text Sharpness Test", category:"Image Quality",
    description:"Displays sample text at a range of sizes so you can check for blurriness, fringing or poor sub-pixel text rendering.",
    renderer:"pattern", params:{variant:"text"}, def:false },

  // ---------------- OLED & Panel Health ----------------
  { id:"burn-in", name:"Burn-In Test", category:"OLED & Panel Health",
    description:"Cycles through solid colors and patterns that can help reveal persistent image retention or burn-in, especially on OLED panels.",
    renderer:"burnIn", params:{}, def:true },
  { id:"image-retention", name:"Image Retention Test", category:"OLED & Panel Health",
    description:"Shows a static high-contrast pattern briefly, then switches to flat gray and white so you can visually inspect for a lingering ghost image.",
    renderer:"imageRetention", params:{}, def:false },
  { id:"oled-black-level", name:"OLED Black Level Test", category:"OLED & Panel Health",
    description:"Cycles through near-black shades just above true black, useful on OLED panels for spotting uneven black levels or faint glow.",
    renderer:"solid", params:{colors:["#000000","#050505","#0A0A0A","#141414"]}, def:false },
  { id:"oled-gray", name:"OLED Gray Test", category:"OLED & Panel Health",
    description:"Cycles through dark-to-mid gray tones, a range where OLED panels can sometimes show banding or slight color tinting.",
    renderer:"solid", params:{colors:["#101010","#303030","#505050","#707070"]}, def:false },

  // ---------------- Orientation ----------------
  { id:"screen-orientation", name:"Screen Orientation Test", category:"Orientation",
    description:"Reads your device's current orientation (portrait or landscape) using the browser's Screen Orientation API and displays it live as you rotate.",
    renderer:"orientation", params:{variant:"basic"}, def:false },
  { id:"auto-rotate", name:"Auto-Rotate Test", category:"Orientation",
    description:"Rotate your physical device and watch whether the reported orientation updates automatically — confirming your device's auto-rotate is working.",
    renderer:"orientation", params:{variant:"autorotate"}, def:false }
];

const TEST_MAP = Object.fromEntries(TESTS.map(t => [t.id, t]));

/* ---------------------------------------------------------------------
   1b. QUICK-START GROUPS
   These power the category button grid. Each group bundles a curated
   set of test ids so clicking one card jumps straight into that run.
   `match` lists alternate spellings so shortcode input like
   "Pixel & Display test" or "OLED & Burn in" resolves correctly.
--------------------------------------------------------------------- */
const GI = { // small inline icon set (24x24, stroke=currentColor)
  target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3H5a2 2 0 00-2 2v2M17 3h2a2 2 0 012 2v2M7 21H5a2 2 0 01-2-2v-2M17 21h2a2 2 0 002-2v-2"/><circle cx="12" cy="12" r="3"/></svg>`,
  palette: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a9 9 0 110-18c4.5 0 8 3 8 6.5 0 2-1.5 3.5-3.5 3.5H14a1.8 1.8 0 00-1 3.3c.3.3.5.7.5 1.2 0 1.4-1.1 2.5-1.5 3.5z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/></svg>`,
  gradient: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="11" cy="18" r="2" fill="currentColor" stroke="none"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  fingerprint: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a5 5 0 015 5v1c0 3-1 5-1 7M7 8a5 5 0 0110 0M4 9a8 8 0 011-3.5M12 22c-2-2-3-4-3-7V9M12 22c2-2 3-4 3-7V9a3 3 0 00-6 0v6c0 1.5.5 3 1.5 4.5"/></svg>`,
  wave: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h4l2-7 4 14 3-9 2 5h5"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>`,
  flame: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c1 3-2 4-2 7a3 3 0 006 0c2 2 3 4 3 6a7 7 0 11-14 0c0-3 2-5 3-7 1 1 1 2 2 2 0-3-1-5 2-8z"/></svg>`,
  compass: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15 9l-2 6-6 2 2-6 6-2z"/></svg>`,
  text: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6h14M5 6v-.5A1.5 1.5 0 016.5 4h11A1.5 1.5 0 0119 5.5V6M12 6v14M9 20h6"/></svg>`
};

const CARD_THEMES = [
  { bg:"#EEF0FF", fg:"#4C5FD9" },
  { bg:"#E8EBFF", fg:"#4254C7" },
  { bg:"#F3F4FF", fg:"#5B6DDD" },
  { bg:"#E3E7FF", fg:"#394AB6" },
  { bg:"#F0F2FF", fg:"#6575DF" },
  { bg:"#E9ECFA", fg:"#4C5FD9" }
];

const ILLUS = {"pixel-display": "<svg viewBox=\"0 0 200 150\" xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"xMidYMid slice\" aria-hidden=\"true\"><defs><radialGradient id=\"bga\" cx=\".5\" cy=\".4\" r=\".8\"><stop offset=\"0\" stop-color=\"#EEF3FF\"/><stop offset=\"1\" stop-color=\"#DCE6FA\"/></radialGradient><linearGradient id=\"bda\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#5A607F\"/><stop offset=\".5\" stop-color=\"#1B1E38\"/><stop offset=\"1\" stop-color=\"#3A3F5E\"/></linearGradient><filter id=\"sha\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\"><feGaussianBlur stdDeviation=\"3.2\"/></filter><clipPath id=\"cpa\"><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\"/></clipPath></defs><rect width=\"200\" height=\"150\" fill=\"url(#bga)\"/><ellipse cx=\"100\" cy=\"143\" rx=\"36\" ry=\"4.5\" fill=\"#1E2347\" opacity=\".28\" filter=\"url(#sha)\"/><rect x=\"62.5\" y=\"40\" width=\"1.8\" height=\"12\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"62.5\" y=\"58\" width=\"1.8\" height=\"18\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"135.7\" y=\"52\" width=\"1.8\" height=\"22\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"64\" y=\"10\" width=\"72\" height=\"128\" rx=\"14\" fill=\"url(#bda)\"/><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\" fill=\"#0B0E1F\"/><g clip-path=\"url(#cpa)\"><rect x=\"69.9\" y=\"17.9\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"80.2\" y=\"17.9\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"90.6\" y=\"17.9\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"100.9\" y=\"17.9\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"111.2\" y=\"17.9\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"121.6\" y=\"17.9\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"69.9\" y=\"28.4\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"80.2\" y=\"28.4\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"90.6\" y=\"28.4\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"100.9\" y=\"28.4\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"111.2\" y=\"28.4\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"121.6\" y=\"28.4\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"69.9\" y=\"39.0\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"80.2\" y=\"39.0\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"90.6\" y=\"39.0\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"100.9\" y=\"39.0\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"111.2\" y=\"39.0\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"121.6\" y=\"39.0\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"69.9\" y=\"49.5\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"80.2\" y=\"49.5\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"90.6\" y=\"49.5\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"100.9\" y=\"49.5\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"111.2\" y=\"49.5\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"121.6\" y=\"49.5\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"69.9\" y=\"60.1\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"80.2\" y=\"60.1\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"90.6\" y=\"60.1\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"100.9\" y=\"60.1\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"111.2\" y=\"60.1\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"121.6\" y=\"60.1\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"69.9\" y=\"70.6\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"80.2\" y=\"70.6\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"90.6\" y=\"70.6\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"100.9\" y=\"70.6\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#0B0E1F\"/><rect x=\"111.2\" y=\"70.6\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"121.6\" y=\"70.6\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"69.9\" y=\"81.2\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"80.2\" y=\"81.2\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"90.6\" y=\"81.2\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"100.9\" y=\"81.2\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"111.2\" y=\"81.2\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"121.6\" y=\"81.2\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"69.9\" y=\"91.7\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"80.2\" y=\"91.7\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"90.6\" y=\"91.7\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"100.9\" y=\"91.7\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"111.2\" y=\"91.7\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"121.6\" y=\"91.7\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"69.9\" y=\"102.3\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"80.2\" y=\"102.3\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"90.6\" y=\"102.3\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"100.9\" y=\"102.3\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"111.2\" y=\"102.3\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"121.6\" y=\"102.3\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"69.9\" y=\"112.8\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"80.2\" y=\"112.8\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"90.6\" y=\"112.8\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"100.9\" y=\"112.8\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"111.2\" y=\"112.8\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"121.6\" y=\"112.8\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"69.9\" y=\"123.4\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"80.2\" y=\"123.4\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"90.6\" y=\"123.4\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><rect x=\"100.9\" y=\"123.4\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#2ECC71\"/><rect x=\"111.2\" y=\"123.4\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#4D7CFF\"/><rect x=\"121.6\" y=\"123.4\" width=\"8.5\" height=\"8.7\" rx=\"1.6\" fill=\"#FF4D4D\"/><polygon points=\"69,17 103,17 69,87\" fill=\"#fff\" opacity=\".10\"/></g><rect x=\"93\" y=\"21.5\" width=\"14\" height=\"4.2\" rx=\"2.1\" fill=\"#05060D\"/><circle cx=\"105.2\" cy=\"75.0\" r=\"8\" fill=\"none\" stroke=\"#FFC857\" stroke-width=\"1.5\" stroke-dasharray=\"3 2\"/></svg>", "solid-color": "<svg viewBox=\"0 0 200 150\" xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"xMidYMid slice\" aria-hidden=\"true\"><defs><radialGradient id=\"bgb\" cx=\".5\" cy=\".4\" r=\".8\"><stop offset=\"0\" stop-color=\"#EEF3FF\"/><stop offset=\"1\" stop-color=\"#DCE6FA\"/></radialGradient><linearGradient id=\"bdb\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#5A607F\"/><stop offset=\".5\" stop-color=\"#1B1E38\"/><stop offset=\"1\" stop-color=\"#3A3F5E\"/></linearGradient><filter id=\"shb\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\"><feGaussianBlur stdDeviation=\"3.2\"/></filter><clipPath id=\"cpb\"><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\"/></clipPath></defs><rect width=\"200\" height=\"150\" fill=\"url(#bgb)\"/><defs><linearGradient id=\"glb\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#fff\" stop-opacity=\".35\"/><stop offset=\".5\" stop-color=\"#fff\" stop-opacity=\"0\"/><stop offset=\"1\" stop-color=\"#000\" stop-opacity=\".12\"/></linearGradient></defs><ellipse cx=\"100\" cy=\"132\" rx=\"62\" ry=\"6\" fill=\"#1E2347\" opacity=\".22\" filter=\"url(#shb)\"/><g transform=\"rotate(-20 58 126)\"><rect x=\"37\" y=\"34\" width=\"42\" height=\"92\" rx=\"9\" fill=\"#FF3B3B\" stroke=\"#D5DCF5\" stroke-width=\"1\"/><rect x=\"37\" y=\"34\" width=\"42\" height=\"92\" rx=\"9\" fill=\"url(#glb)\"/></g><g transform=\"rotate(-7 82 126)\"><rect x=\"61\" y=\"34\" width=\"42\" height=\"92\" rx=\"9\" fill=\"#16C25F\" stroke=\"#D5DCF5\" stroke-width=\"1\"/><rect x=\"61\" y=\"34\" width=\"42\" height=\"92\" rx=\"9\" fill=\"url(#glb)\"/></g><g transform=\"rotate(6 108 126)\"><rect x=\"87\" y=\"34\" width=\"42\" height=\"92\" rx=\"9\" fill=\"#2F8BFF\" stroke=\"#D5DCF5\" stroke-width=\"1\"/><rect x=\"87\" y=\"34\" width=\"42\" height=\"92\" rx=\"9\" fill=\"url(#glb)\"/></g><g transform=\"rotate(19 134 126)\"><rect x=\"113\" y=\"34\" width=\"42\" height=\"92\" rx=\"9\" fill=\"#FFFFFF\" stroke=\"#D5DCF5\" stroke-width=\"1\"/><rect x=\"113\" y=\"34\" width=\"42\" height=\"92\" rx=\"9\" fill=\"url(#glb)\"/></g></svg>", "gradient": "<svg viewBox=\"0 0 200 150\" xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"xMidYMid slice\" aria-hidden=\"true\"><defs><radialGradient id=\"bgc\" cx=\".5\" cy=\".4\" r=\".8\"><stop offset=\"0\" stop-color=\"#EEF3FF\"/><stop offset=\"1\" stop-color=\"#DCE6FA\"/></radialGradient><linearGradient id=\"bdc\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#5A607F\"/><stop offset=\".5\" stop-color=\"#1B1E38\"/><stop offset=\"1\" stop-color=\"#3A3F5E\"/></linearGradient><filter id=\"shc\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\"><feGaussianBlur stdDeviation=\"3.2\"/></filter><clipPath id=\"cpc\"><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\"/></clipPath></defs><rect width=\"200\" height=\"150\" fill=\"url(#bgc)\"/><defs><linearGradient id=\"grc\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#FF6B8B\"/><stop offset=\".35\" stop-color=\"#FFC371\"/><stop offset=\".7\" stop-color=\"#47C9E5\"/><stop offset=\"1\" stop-color=\"#6C63FF\"/></linearGradient></defs><ellipse cx=\"100\" cy=\"143\" rx=\"36\" ry=\"4.5\" fill=\"#1E2347\" opacity=\".28\" filter=\"url(#shc)\"/><rect x=\"62.5\" y=\"40\" width=\"1.8\" height=\"12\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"62.5\" y=\"58\" width=\"1.8\" height=\"18\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"135.7\" y=\"52\" width=\"1.8\" height=\"22\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"64\" y=\"10\" width=\"72\" height=\"128\" rx=\"14\" fill=\"url(#bdc)\"/><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\" fill=\"#0B0E1F\"/><g clip-path=\"url(#cpc)\"><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" fill=\"url(#grc)\"/><polygon points=\"69,17 103,17 69,87\" fill=\"#fff\" opacity=\".10\"/></g><rect x=\"93\" y=\"21.5\" width=\"14\" height=\"4.2\" rx=\"2.1\" fill=\"#05060D\"/></svg>", "brightness-uniformity": "<svg viewBox=\"0 0 200 150\" xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"xMidYMid slice\" aria-hidden=\"true\"><defs><radialGradient id=\"bgd\" cx=\".5\" cy=\".4\" r=\".8\"><stop offset=\"0\" stop-color=\"#EEF3FF\"/><stop offset=\"1\" stop-color=\"#DCE6FA\"/></radialGradient><linearGradient id=\"bdd\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#5A607F\"/><stop offset=\".5\" stop-color=\"#1B1E38\"/><stop offset=\"1\" stop-color=\"#3A3F5E\"/></linearGradient><filter id=\"shd\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\"><feGaussianBlur stdDeviation=\"3.2\"/></filter><clipPath id=\"cpd\"><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\"/></clipPath></defs><rect width=\"200\" height=\"150\" fill=\"url(#bgd)\"/><defs><radialGradient id=\"rgd\" cx=\".5\" cy=\".3\" r=\".75\"><stop offset=\"0\" stop-color=\"#FFFFFF\"/><stop offset=\".45\" stop-color=\"#C5D3F5\"/><stop offset=\"1\" stop-color=\"#6F86C9\"/></radialGradient></defs><ellipse cx=\"100\" cy=\"143\" rx=\"36\" ry=\"4.5\" fill=\"#1E2347\" opacity=\".28\" filter=\"url(#shd)\"/><rect x=\"62.5\" y=\"40\" width=\"1.8\" height=\"12\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"62.5\" y=\"58\" width=\"1.8\" height=\"18\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"135.7\" y=\"52\" width=\"1.8\" height=\"22\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"64\" y=\"10\" width=\"72\" height=\"128\" rx=\"14\" fill=\"url(#bdd)\"/><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\" fill=\"#0B0E1F\"/><g clip-path=\"url(#cpd)\"><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" fill=\"url(#rgd)\"/><polygon points=\"69,17 103,17 69,87\" fill=\"#fff\" opacity=\".10\"/></g><rect x=\"93\" y=\"21.5\" width=\"14\" height=\"4.2\" rx=\"2.1\" fill=\"#05060D\"/></svg>", "pattern": "<svg viewBox=\"0 0 200 150\" xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"xMidYMid slice\" aria-hidden=\"true\"><defs><radialGradient id=\"bge\" cx=\".5\" cy=\".4\" r=\".8\"><stop offset=\"0\" stop-color=\"#EEF3FF\"/><stop offset=\"1\" stop-color=\"#DCE6FA\"/></radialGradient><linearGradient id=\"bde\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#5A607F\"/><stop offset=\".5\" stop-color=\"#1B1E38\"/><stop offset=\"1\" stop-color=\"#3A3F5E\"/></linearGradient><filter id=\"she\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\"><feGaussianBlur stdDeviation=\"3.2\"/></filter><clipPath id=\"cpe\"><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\"/></clipPath></defs><rect width=\"200\" height=\"150\" fill=\"url(#bge)\"/><ellipse cx=\"100\" cy=\"143\" rx=\"36\" ry=\"4.5\" fill=\"#1E2347\" opacity=\".28\" filter=\"url(#she)\"/><rect x=\"62.5\" y=\"40\" width=\"1.8\" height=\"12\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"62.5\" y=\"58\" width=\"1.8\" height=\"18\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"135.7\" y=\"52\" width=\"1.8\" height=\"22\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"64\" y=\"10\" width=\"72\" height=\"128\" rx=\"14\" fill=\"url(#bde)\"/><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\" fill=\"#fff\"/><g clip-path=\"url(#cpe)\"><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" fill=\"#fff\"/><rect x=\"69.0\" y=\"17.0\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"89.7\" y=\"17.0\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"110.3\" y=\"17.0\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"79.3\" y=\"26.7\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"100.0\" y=\"26.7\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"120.7\" y=\"26.7\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"69.0\" y=\"36.3\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"89.7\" y=\"36.3\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"110.3\" y=\"36.3\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"79.3\" y=\"46.0\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"100.0\" y=\"46.0\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"120.7\" y=\"46.0\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"69.0\" y=\"55.7\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"89.7\" y=\"55.7\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"110.3\" y=\"55.7\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"79.3\" y=\"65.3\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"100.0\" y=\"65.3\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"120.7\" y=\"65.3\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"69.0\" y=\"75.0\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"89.7\" y=\"75.0\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"110.3\" y=\"75.0\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"79.3\" y=\"84.7\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"100.0\" y=\"84.7\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"120.7\" y=\"84.7\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"69.0\" y=\"94.3\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"89.7\" y=\"94.3\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"110.3\" y=\"94.3\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"79.3\" y=\"104.0\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"100.0\" y=\"104.0\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"120.7\" y=\"104.0\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"69.0\" y=\"113.7\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"89.7\" y=\"113.7\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"110.3\" y=\"113.7\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"79.3\" y=\"123.3\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"100.0\" y=\"123.3\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><rect x=\"120.7\" y=\"123.3\" width=\"10.3\" height=\"9.7\" fill=\"#1B1E38\"/><polygon points=\"69,17 103,17 69,87\" fill=\"#fff\" opacity=\".10\"/></g><rect x=\"93\" y=\"21.5\" width=\"14\" height=\"4.2\" rx=\"2.1\" fill=\"#05060D\"/></svg>", "touch": "<svg viewBox=\"0 0 200 150\" xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"xMidYMid slice\" aria-hidden=\"true\"><defs><radialGradient id=\"bgf\" cx=\".5\" cy=\".4\" r=\".8\"><stop offset=\"0\" stop-color=\"#EEF3FF\"/><stop offset=\"1\" stop-color=\"#DCE6FA\"/></radialGradient><linearGradient id=\"bdf\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#5A607F\"/><stop offset=\".5\" stop-color=\"#1B1E38\"/><stop offset=\"1\" stop-color=\"#3A3F5E\"/></linearGradient><filter id=\"shf\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\"><feGaussianBlur stdDeviation=\"3.2\"/></filter><clipPath id=\"cpf\"><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\"/></clipPath></defs><rect width=\"200\" height=\"150\" fill=\"url(#bgf)\"/><ellipse cx=\"100\" cy=\"143\" rx=\"36\" ry=\"4.5\" fill=\"#1E2347\" opacity=\".28\" filter=\"url(#shf)\"/><rect x=\"62.5\" y=\"40\" width=\"1.8\" height=\"12\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"62.5\" y=\"58\" width=\"1.8\" height=\"18\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"135.7\" y=\"52\" width=\"1.8\" height=\"22\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"64\" y=\"10\" width=\"72\" height=\"128\" rx=\"14\" fill=\"url(#bdf)\"/><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\" fill=\"#F4F6FF\"/><g clip-path=\"url(#cpf)\"><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" fill=\"#F4F6FF\"/><path d=\"M80 118 Q92 62 122 78\" stroke=\"#4C5FD9\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\" stroke-dasharray=\"1 7\"/><circle cx=\"100\" cy=\"60\" r=\"19\" fill=\"#4C5FD9\" opacity=\".12\"/><circle cx=\"100\" cy=\"60\" r=\"11\" fill=\"#4C5FD9\" opacity=\".25\"/><circle cx=\"100\" cy=\"60\" r=\"5\" fill=\"#4C5FD9\"/><circle cx=\"82\" cy=\"108\" r=\"9\" fill=\"#12A567\" opacity=\".25\"/><circle cx=\"82\" cy=\"108\" r=\"4\" fill=\"#12A567\"/><circle cx=\"118\" cy=\"114\" r=\"9\" fill=\"#E5484D\" opacity=\".25\"/><circle cx=\"118\" cy=\"114\" r=\"4\" fill=\"#E5484D\"/><polygon points=\"69,17 103,17 69,87\" fill=\"#fff\" opacity=\".10\"/></g><rect x=\"93\" y=\"21.5\" width=\"14\" height=\"4.2\" rx=\"2.1\" fill=\"#05060D\"/></svg>", "motion-refresh": "<svg viewBox=\"0 0 200 150\" xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"xMidYMid slice\" aria-hidden=\"true\"><defs><radialGradient id=\"bgg\" cx=\".5\" cy=\".4\" r=\".8\"><stop offset=\"0\" stop-color=\"#EEF3FF\"/><stop offset=\"1\" stop-color=\"#DCE6FA\"/></radialGradient><linearGradient id=\"bdg\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#5A607F\"/><stop offset=\".5\" stop-color=\"#1B1E38\"/><stop offset=\"1\" stop-color=\"#3A3F5E\"/></linearGradient><filter id=\"shg\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\"><feGaussianBlur stdDeviation=\"3.2\"/></filter><clipPath id=\"cpg\"><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\"/></clipPath></defs><rect width=\"200\" height=\"150\" fill=\"url(#bgg)\"/><ellipse cx=\"100\" cy=\"143\" rx=\"36\" ry=\"4.5\" fill=\"#1E2347\" opacity=\".28\" filter=\"url(#shg)\"/><rect x=\"62.5\" y=\"40\" width=\"1.8\" height=\"12\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"62.5\" y=\"58\" width=\"1.8\" height=\"18\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"135.7\" y=\"52\" width=\"1.8\" height=\"22\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"64\" y=\"10\" width=\"72\" height=\"128\" rx=\"14\" fill=\"url(#bdg)\"/><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\" fill=\"#0B0E1F\"/><g clip-path=\"url(#cpg)\"><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" fill=\"#0F1230\"/><circle cx=\"82.0\" cy=\"118.0\" r=\"3.5\" fill=\"#47C9E5\" opacity=\"0.15\"/><circle cx=\"90.5\" cy=\"108.0\" r=\"4.5\" fill=\"#47C9E5\" opacity=\"0.28\"/><circle cx=\"99.0\" cy=\"98.0\" r=\"5.5\" fill=\"#47C9E5\" opacity=\"0.41\"/><circle cx=\"107.5\" cy=\"88.0\" r=\"6.5\" fill=\"#47C9E5\" opacity=\"0.54\"/><circle cx=\"116.0\" cy=\"78.0\" r=\"7.5\" fill=\"#47C9E5\" opacity=\"0.67\"/><circle cx=\"124.5\" cy=\"68.0\" r=\"8.5\" fill=\"#47C9E5\" opacity=\"0.80\"/><circle cx=\"133.0\" cy=\"58.0\" r=\"9.5\" fill=\"#47C9E5\" opacity=\"0.93\"/><text x=\"100\" y=\"46\" font-family=\"Arial,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#fff\" text-anchor=\"middle\">120 Hz</text><polygon points=\"69,17 103,17 69,87\" fill=\"#fff\" opacity=\".10\"/></g><rect x=\"93\" y=\"21.5\" width=\"14\" height=\"4.2\" rx=\"2.1\" fill=\"#05060D\"/></svg>", "image-quality": "<svg viewBox=\"0 0 200 150\" xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"xMidYMid slice\" aria-hidden=\"true\"><defs><radialGradient id=\"bgh\" cx=\".5\" cy=\".4\" r=\".8\"><stop offset=\"0\" stop-color=\"#EEF3FF\"/><stop offset=\"1\" stop-color=\"#DCE6FA\"/></radialGradient><linearGradient id=\"bdh\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#5A607F\"/><stop offset=\".5\" stop-color=\"#1B1E38\"/><stop offset=\"1\" stop-color=\"#3A3F5E\"/></linearGradient><filter id=\"shh\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\"><feGaussianBlur stdDeviation=\"3.2\"/></filter><clipPath id=\"cph\"><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\"/></clipPath></defs><rect width=\"200\" height=\"150\" fill=\"url(#bgh)\"/><ellipse cx=\"100\" cy=\"143\" rx=\"36\" ry=\"4.5\" fill=\"#1E2347\" opacity=\".28\" filter=\"url(#shh)\"/><rect x=\"62.5\" y=\"40\" width=\"1.8\" height=\"12\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"62.5\" y=\"58\" width=\"1.8\" height=\"18\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"135.7\" y=\"52\" width=\"1.8\" height=\"22\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"64\" y=\"10\" width=\"72\" height=\"128\" rx=\"14\" fill=\"url(#bdh)\"/><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\" fill=\"#0B0E1F\"/><g clip-path=\"url(#cph)\"><defs><linearGradient id=\"skh\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#7FB5FF\"/><stop offset=\"1\" stop-color=\"#FFE3B8\"/></linearGradient></defs><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" fill=\"url(#skh)\"/><circle cx=\"118\" cy=\"48\" r=\"8\" fill=\"#FFD24D\"/><path d=\"M69 133 V96 L92 66 L108 90 L120 76 L131 94 V133Z\" fill=\"#3D4CB8\"/><path d=\"M69 133 V114 L88 98 L106 116 L131 102 V133Z\" fill=\"#12A567\"/><polygon points=\"69,17 103,17 69,87\" fill=\"#fff\" opacity=\".10\"/></g><rect x=\"93\" y=\"21.5\" width=\"14\" height=\"4.2\" rx=\"2.1\" fill=\"#05060D\"/></svg>", "oled-burnin": "<svg viewBox=\"0 0 200 150\" xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"xMidYMid slice\" aria-hidden=\"true\"><defs><radialGradient id=\"bgi\" cx=\".5\" cy=\".4\" r=\".8\"><stop offset=\"0\" stop-color=\"#EEF3FF\"/><stop offset=\"1\" stop-color=\"#DCE6FA\"/></radialGradient><linearGradient id=\"bdi\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#5A607F\"/><stop offset=\".5\" stop-color=\"#1B1E38\"/><stop offset=\"1\" stop-color=\"#3A3F5E\"/></linearGradient><filter id=\"shi\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\"><feGaussianBlur stdDeviation=\"3.2\"/></filter><clipPath id=\"cpi\"><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\"/></clipPath></defs><rect width=\"200\" height=\"150\" fill=\"url(#bgi)\"/><ellipse cx=\"100\" cy=\"143\" rx=\"36\" ry=\"4.5\" fill=\"#1E2347\" opacity=\".28\" filter=\"url(#shi)\"/><rect x=\"62.5\" y=\"40\" width=\"1.8\" height=\"12\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"62.5\" y=\"58\" width=\"1.8\" height=\"18\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"135.7\" y=\"52\" width=\"1.8\" height=\"22\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"64\" y=\"10\" width=\"72\" height=\"128\" rx=\"14\" fill=\"url(#bdi)\"/><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\" fill=\"#000\"/><g clip-path=\"url(#cpi)\"><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" fill=\"#000\"/><rect x=\"78\" y=\"120\" width=\"44\" height=\"5\" rx=\"2.5\" fill=\"#7886E4\" opacity=\".3\"/><circle cx=\"100\" cy=\"76\" r=\"15\" fill=\"none\" stroke=\"#7886E4\" stroke-width=\"4\" opacity=\".3\"/><rect x=\"82\" y=\"38\" width=\"36\" height=\"6\" rx=\"3\" fill=\"#7886E4\" opacity=\".3\"/><polygon points=\"69,17 103,17 69,87\" fill=\"#fff\" opacity=\".10\"/></g><rect x=\"93\" y=\"21.5\" width=\"14\" height=\"4.2\" rx=\"2.1\" fill=\"#05060D\"/></svg>", "orientation": "<svg viewBox=\"0 0 200 150\" xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"xMidYMid slice\" aria-hidden=\"true\"><defs><radialGradient id=\"bgo\" cx=\".5\" cy=\".4\" r=\".8\"><stop offset=\"0\" stop-color=\"#EEF3FF\"/><stop offset=\"1\" stop-color=\"#DCE6FA\"/></radialGradient><linearGradient id=\"bdo\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#5A607F\"/><stop offset=\".5\" stop-color=\"#1B1E38\"/><stop offset=\"1\" stop-color=\"#3A3F5E\"/></linearGradient><filter id=\"sho\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\"><feGaussianBlur stdDeviation=\"3.2\"/></filter><clipPath id=\"cpo\"><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\"/></clipPath></defs><rect width=\"200\" height=\"150\" fill=\"url(#bgo)\"/><ellipse cx=\"100\" cy=\"136\" rx=\"62\" ry=\"5\" fill=\"#1E2347\" opacity=\".22\" filter=\"url(#sho)\"/><rect x=\"30\" y=\"28\" width=\"52\" height=\"92\" rx=\"11\" fill=\"url(#bdo)\"/><rect x=\"34\" y=\"32\" width=\"44\" height=\"84\" rx=\"8\" fill=\"#4C5FD9\"/><polygon points=\"34,32 60,32 34,68\" fill=\"#fff\" opacity=\".12\"/><rect x=\"104\" y=\"56\" width=\"76\" height=\"52\" rx=\"11\" fill=\"url(#bdo)\"/><rect x=\"108\" y=\"60\" width=\"68\" height=\"44\" rx=\"8\" fill=\"#7886E4\"/><polygon points=\"108,60 134,60 108,96\" fill=\"#fff\" opacity=\".12\"/><path d=\"M88 52 Q100 30 116 46\" stroke=\"#4C5FD9\" stroke-width=\"3.2\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M108 38 L117 47 L105 51\" stroke=\"#4C5FD9\" stroke-width=\"3.2\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>", "text-clarity": "<svg viewBox=\"0 0 200 150\" xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"xMidYMid slice\" aria-hidden=\"true\"><defs><radialGradient id=\"bgk\" cx=\".5\" cy=\".4\" r=\".8\"><stop offset=\"0\" stop-color=\"#EEF3FF\"/><stop offset=\"1\" stop-color=\"#DCE6FA\"/></radialGradient><linearGradient id=\"bdk\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#5A607F\"/><stop offset=\".5\" stop-color=\"#1B1E38\"/><stop offset=\"1\" stop-color=\"#3A3F5E\"/></linearGradient><filter id=\"shk\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\"><feGaussianBlur stdDeviation=\"3.2\"/></filter><clipPath id=\"cpk\"><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\"/></clipPath></defs><rect width=\"200\" height=\"150\" fill=\"url(#bgk)\"/><ellipse cx=\"100\" cy=\"143\" rx=\"36\" ry=\"4.5\" fill=\"#1E2347\" opacity=\".28\" filter=\"url(#shk)\"/><rect x=\"62.5\" y=\"40\" width=\"1.8\" height=\"12\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"62.5\" y=\"58\" width=\"1.8\" height=\"18\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"135.7\" y=\"52\" width=\"1.8\" height=\"22\" rx=\".9\" fill=\"#2A2E4A\"/><rect x=\"64\" y=\"10\" width=\"72\" height=\"128\" rx=\"14\" fill=\"url(#bdk)\"/><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" rx=\"9.5\" fill=\"#fff\"/><g clip-path=\"url(#cpk)\"><rect x=\"69\" y=\"17\" width=\"62\" height=\"116\" fill=\"#fff\"/><text x=\"100\" y=\"72\" font-family=\"Georgia,serif\" font-size=\"30\" font-weight=\"700\" fill=\"#161A33\" text-anchor=\"middle\">Aa</text><rect x=\"79\" y=\"88\" width=\"44\" height=\"4\" rx=\"2\" fill=\"#9198BC\"/><rect x=\"79\" y=\"99\" width=\"37\" height=\"4\" rx=\"2\" fill=\"#9198BC\"/><rect x=\"79\" y=\"110\" width=\"30\" height=\"4\" rx=\"2\" fill=\"#9198BC\"/><rect x=\"79\" y=\"121\" width=\"23\" height=\"4\" rx=\"2\" fill=\"#9198BC\"/><polygon points=\"69,17 103,17 69,87\" fill=\"#fff\" opacity=\".10\"/></g><rect x=\"93\" y=\"21.5\" width=\"14\" height=\"4.2\" rx=\"2.1\" fill=\"#05060D\"/></svg>"};

const GROUPS = [
  { key:"pixel-display", label:"Pixel & Display Test", badge:"Essential", icon:GI.target,
    description:"Multi-color fullscreen scan for dead, stuck & sub-pixels",
    testIds:["test-pattern","dead-pixel","stuck-pixel","sub-pixel","pixel-grid"],
    match:["pixel & display test","pixel & display","pixel and display test","pixel and display","pixel display","pixel & display test."] },
  { key:"solid-color", label:"Solid Color Test", badge:"Essential", icon:GI.palette,
    description:"Full white, black & RGB screens to catch pixel defects",
    testIds:["white-screen","black-screen","red-screen","green-screen","blue-screen","gray-screen"],
    match:["solid color test","solid color","solid colour test","solid colour"] },
  { key:"gradient", label:"Gradient Test", badge:"Recommended", icon:GI.gradient,
    description:"Smooth color transitions, banding, contrast & gamma",
    testIds:["gradients","gradient-banding","contrast-test","gamma-test","color-saturation","color-test","color-distances","color-accuracy"],
    match:["gradient test","gradient","gradients"] },
  { key:"brightness-uniformity", label:"Brightness & Uniformity", badge:"Recommended", icon:GI.sun,
    description:"Backlight bleed, clouding & panel uniformity",
    testIds:["brightness-test","brightness-uniformity","screen-uniformity","gray-uniformity","backlight-bleed","light-leakage","clouding-test"],
    match:["brightness & uniformity","brightness and uniformity","brightness uniformity","brightness & uniformity test"] },
  { key:"pattern", label:"Pattern Test", badge:"Recommended", icon:GI.grid,
    description:"Checkerboard, moiré & fine-line sharpness patterns",
    testIds:["checkerboard-test","moire-test","fine-lines-test","sharpness-test","resolution-test"],
    match:["pattern test","pattern"] },
  { key:"touch", label:"Touch Test", badge:"Essential", icon:GI.fingerprint,
    description:"Touch precision, multi-touch & dead zones",
    testIds:["touch-coverage","touch-test","multi-touch","touch-accuracy","touch-sensitivity","touch-grid","touch-line","edge-touch","corner-touch","dead-touch-zone","ghost-touch","touch-latency"],
    match:["touch","touch test"] },
  { key:"motion-refresh", label:"Motion & Refresh", badge:"Recommended", icon:GI.wave,
    description:"Refresh rate, ghosting & response time checks",
    testIds:["refresh-rate","motion-test","ghosting-test","motion-blur","frame-skipping","response-time"],
    match:["motion & refresh","motion and refresh","motion refresh","motion & refresh test"] },
  { key:"image-quality", label:"Image Quality", badge:"Recommended", icon:GI.eye,
    description:"Viewing angle & native-resolution clarity checks",
    testIds:["viewing-angle","resolution-test"],
    match:["image quality","image quality test"] },
  { key:"oled-burnin", label:"OLED & Burn-in", badge:"Essential", icon:GI.flame,
    description:"OLED burn-in, image retention & pixel aging",
    testIds:["burn-in","image-retention","oled-black-level","oled-gray"],
    match:["oled & burn in","oled and burn in","oled burn in","oled & burn-in","oled & panel health"] },
  { key:"orientation", label:"Orientation", badge:"Recommended", icon:GI.compass,
    description:"Screen rotation & auto-rotate detection",
    testIds:["screen-orientation","auto-rotate"],
    match:["orientation","orientation test"] },
  { key:"text-clarity", label:"Text Clarity", badge:"Recommended", icon:GI.text,
    description:"Text sharpness & sub-pixel rendering check",
    testIds:["text-sharpness"],
    match:["text pattern","text clarity","text sharpness","text clarity test"] }
];
const GROUP_MAP = Object.fromEntries(GROUPS.map(g => [g.key, g]));

function normalizeLabel(s){
  return String(s || "").toLowerCase().trim().replace(/[-_]+/g," ").replace(/\s+/g," ");
}

/* Resolve which groups to show + in what order, based on an optional
   global array (set by the WordPress shortcode before app.js runs). */
function resolveGroupOrder(){
  const raw = window.SCREEN_TEST_CATEGORY_ORDER;
  if(!Array.isArray(raw) || !raw.length) return GROUPS.slice();
  const out = [];
  raw.forEach(item => {
    // "Solid Color=My Custom Name" -> custom card title
    const parts = String(item).split("=");
    const name = parts[0];
    const custom = parts.length > 1 ? parts.slice(1).join("=").trim() : "";
    const n = normalizeLabel(name);
    const found = GROUPS.find(g => normalizeLabel(g.label) === n || g.match.some(m => normalizeLabel(m) === n));
    if(found && !out.some(o => o.key === found.key)){
      out.push(custom ? Object.assign({}, found, { label: custom.replace(/</g,"&lt;").replace(/>/g,"&gt;") }) : found);
    }
  });
  return out.length ? out : GROUPS.slice();
}

/* "Start Screen Test" button sequence: group key + how many tests to take
   (0 = all). Duplicate tests are only run once. */
const START_SEQUENCE = [
  { key:"touch", count:6 },
  { key:"solid-color", count:0 },
  { key:"text-clarity", count:0 },
  { key:"image-quality", count:0 },
  { key:"brightness-uniformity", count:1 },
  { key:"pattern", count:0 },
  { key:"motion-refresh", count:0 }
];
function buildStartSequence(){
  const seen = new Set(), ids = [];
  START_SEQUENCE.forEach(step => {
    const list = GROUP_MAP[step.key].testIds;
    (step.count ? list.slice(0, step.count) : list).forEach(id => {
      if(!seen.has(id)){ seen.add(id); ids.push(id); }
    });
  });
  return ids;
}

/* ---------------------------------------------------------------------
   2. APP STATE + PERSISTENCE
--------------------------------------------------------------------- */
const STORAGE_KEY = "screenTestSelection.v1";

const isHeadless = !!document.querySelector(".stt-headless #screen-test-app");

const state = {
  selected: new Set(),
  runOrder: [],
  currentIndex: 0,
  results: {},       // id -> 'passed' | 'problem' | 'skipped'
  currentTeardown: null,
  controlsHidden: false,
  hideTimer: null,
  swipe: null,
  fromSequence: false,
  entryScreen: "#category-screen" // which screen Exit should return to
};

/* Keep the app's screens in browser history so Android's hardware Back
   button returns to the previous Screen Test view instead of leaving the
   page while the test runner or individual-test screen is open. */
const HISTORY_KEY = "screenTestView";

function setHistoryView(view, mode="push"){
  try{
    const nextState = Object.assign({}, history.state || {}, { [HISTORY_KEY]: view });
    if(mode === "replace") history.replaceState(nextState, "");
    else history.pushState(nextState, "");
  }catch(e){ /* History API unavailable — the on-screen controls still work */ }
}

function currentHistoryView(){
  return history.state && history.state[HISTORY_KEY];
}

function loadSelection(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const arr = JSON.parse(raw);
      if(Array.isArray(arr) && arr.length){
        return new Set(arr.filter(id => TEST_MAP[id]));
      }
    }
  }catch(e){ /* ignore corrupt storage */ }
  return new Set(TESTS.filter(t => t.def).map(t => t.id));
}

function saveSelection(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(state.selected)));
  }catch(e){ /* storage unavailable — fail silently */ }
}

state.selected = loadSelection();

/* ---------------------------------------------------------------------
   3. SELECTION SCREEN
--------------------------------------------------------------------- */
const el = (sel, root=document) => root.querySelector(sel);
const els = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const ICONS = {
  play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M10 8.5l6 3.5-6 3.5v-7z" fill="currentColor" stroke="none"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-4-4"/></svg>`
};

function buildCategoryScreen(){
  const grid = el("#category-grid");
  if(!grid) return;
  grid.innerHTML = "";
  const groups = resolveGroupOrder();
  groups.forEach((g, i) => {
    const theme = CARD_THEMES[i % CARD_THEMES.length];
    const card = document.createElement("button");
    card.className = "category-card";
    card.type = "button";
    card.dataset.group = g.key;
    card.innerHTML = `
      <div class="cat-wrap">
        <div class="cat-illus">${ILLUS[g.key] || ""}</div>
        ${g.badge ? `<span class="category-badge ${g.badge === "Essential" ? "is-essential" : "is-recommended"}">${g.badge}</span>` : ""}
      </div>
      <div class="category-title">${g.label}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </div>
      <div class="category-desc">${g.description}</div>
    `;
    card.addEventListener("click", () => runGroup(g));
    grid.appendChild(card);
  });
}

function runStartSequence(){
  const ids = buildStartSequence();
  if(!ids.length) return;
  state.selected = new Set(ids);
  saveSelection();
  state.entryScreen = isHeadless ? null : "#category-screen";
  state.fromSequence = true;
  setHistoryView("runner");
  el("#category-screen").classList.add("hidden");
  el("#selection-screen").classList.add("hidden");
  beginRunner(ids);
}

function runGroup(group){
  state.fromSequence = false;
  state.selected = new Set(group.testIds);
  saveSelection();
  state.entryScreen = "#category-screen";
  setHistoryView("runner");
  el("#category-screen").classList.add("hidden");
  el("#selection-screen").classList.add("hidden");
  beginRunner(group.testIds.slice());
}

function buildSelectionScreen(){
  const container = el("#categories-container");
  container.innerHTML = "";
  CATEGORY_ORDER.forEach(catName => {
    const testsInCat = TESTS.filter(t => t.category === catName);
    if(!testsInCat.length) return;
    const catEl = document.createElement("div");
    catEl.className = "category";
    catEl.innerHTML = `<div class="category-title"><span class="dot"></span>${catName}</div>`;
    const grid = document.createElement("div");
    grid.className = "test-grid";
    testsInCat.forEach(t => grid.appendChild(buildTestRow(t)));
    catEl.appendChild(grid);
    container.appendChild(catEl);
  });
  updateSelectionUI();
}

function buildTestRow(test){
  const row = document.createElement("div");
  row.className = "test-row";
  row.dataset.id = test.id;
  row.setAttribute("role","checkbox");
  row.setAttribute("tabindex","0");
  row.innerHTML = `
    <button class="play-btn" data-info="${test.id}" aria-label="About ${test.name}" title="About this test">${ICONS.play}</button>
    <span class="test-name">${test.name}</span>
    <span class="checkbox" aria-hidden="true">${ICONS.check}</span>
  `;
  row.addEventListener("click", (e) => {
    if(e.target.closest(".play-btn")) return;
    toggleTest(test.id);
  });
  row.addEventListener("keydown", (e) => {
    if(e.key === "Enter" || e.key === " "){
      e.preventDefault();
      toggleTest(test.id);
    }
  });
  el(".play-btn", row).addEventListener("click", () => openInfoModal(test.id));
  return row;
}

function toggleTest(id){
  if(state.selected.has(id)) state.selected.delete(id);
  else state.selected.add(id);
  saveSelection();
  updateSelectionUI();
}

function updateSelectionUI(){
  els(".test-row").forEach(row => {
    const on = state.selected.has(row.dataset.id);
    row.classList.toggle("selected", on);
    row.setAttribute("aria-checked", on ? "true" : "false");
  });
  const n = state.selected.size;
  el("#count-pill").innerHTML = `<b>${n}</b> test${n===1?"":"s"} selected`;
  el("#start-test-btn").disabled = n === 0;
}

el("#select-all-btn").addEventListener("click", () => {
  TESTS.forEach(t => state.selected.add(t.id));
  saveSelection();
  updateSelectionUI();
});
el("#select-none-btn").addEventListener("click", () => {
  state.selected.clear();
  saveSelection();
  updateSelectionUI();
});

/* ---------------------------------------------------------------------
   4. MODALS
--------------------------------------------------------------------- */
function openInfoModal(id){
  const t = TEST_MAP[id];
  el("#info-modal-cat").textContent = t.category;
  el("#info-modal-title").textContent = t.name;
  el("#info-modal-desc").textContent = t.description;
  el("#info-modal-select").textContent = state.selected.has(id) ? "Remove from selection" : "Select this test";
  el("#info-modal-select").onclick = () => {
    toggleTest(id);
    closeModal("#info-modal-overlay");
  };
  showModal("#info-modal-overlay");
}
el("#info-modal-close").addEventListener("click", () => closeModal("#info-modal-overlay"));

el("#setup-guide-btn").addEventListener("click", () => showModal("#guide-modal-overlay"));
el("#guide-modal-close").addEventListener("click", () => closeModal("#guide-modal-overlay"));

function showModal(sel){ el(sel).classList.remove("hidden"); }
function closeModal(sel){ el(sel).classList.add("hidden"); }

els(".modal-overlay").forEach(ov => {
  ov.addEventListener("click", (e) => { if(e.target === ov) ov.classList.add("hidden"); });
});
document.addEventListener("keydown", (e) => {
  if(e.key === "Escape"){
    els(".modal-overlay:not(.hidden)").forEach(m => {
      if(m.id !== "exit-modal-overlay") m.classList.add("hidden");
    });
  }
});

/* ---------------------------------------------------------------------
   5. TEST RUNNER
--------------------------------------------------------------------- */
const stage = el("#test-stage");
const runner = el("#test-runner");

el("#start-test-btn").addEventListener("click", startRun);
el("#test-again-btn").addEventListener("click", () => {
  setHistoryView("runner", "replace");
  beginRunner(state.runOrder.slice());
});
el("#run-failed-btn").addEventListener("click", () => {
  const failed = state.runOrder.filter(id => state.results[id] === "problem");
  if(failed.length){
    setHistoryView("runner", "replace");
    beginRunner(failed);
  }
});
/* Any [screen_test_button] on the page starts the full sequence */
document.addEventListener("click", (e) => {
  if(e.target.closest && e.target.closest("[data-stt-start]")){ e.preventDefault(); runStartSequence(); }
});
document.addEventListener("click", (e) => {
  const link = e.target.closest && e.target.closest("[data-stt-individual]");
  if(!link) return;
  const h = link.getAttribute("href") || "";
  const target = h.charAt(0) === "#" && h.length > 1 ? document.getElementById(h.slice(1)) : null;
  if(target){ e.preventDefault(); target.scrollIntoView({behavior:"smooth", block:"start"}); }
});
const resultsCloseBtn = el("#results-close-btn");
if(resultsCloseBtn){
  resultsCloseBtn.addEventListener("click", () => {
    el("#results-screen").classList.add("hidden");
    setHistoryView("category", "replace");
  });
}
el("#new-test-btn").addEventListener("click", () => {
  if(isHeadless){ runStartSequence(); return; }
  el("#results-screen").classList.add("hidden");
  el("#category-screen").classList.remove("hidden");
  setHistoryView("category", "replace");
});

const showIndividualLink = el("#show-individual-tests-link");
if(showIndividualLink){
  showIndividualLink.addEventListener("click", () => {
    el("#category-screen").classList.add("hidden");
    el("#selection-screen").classList.remove("hidden");
    setHistoryView("selection");
  });
}
const backToQuickstartLink = el("#back-to-quickstart-link");
if(backToQuickstartLink){
  backToQuickstartLink.addEventListener("click", () => {
    if(currentHistoryView() === "selection") history.back();
    else {
      el("#selection-screen").classList.add("hidden");
      el("#category-screen").classList.remove("hidden");
      setHistoryView("category", "replace");
    }
  });
}

function startRun(){
  const order = TESTS.filter(t => state.selected.has(t.id)).map(t => t.id);
  if(!order.length) return;
  state.entryScreen = "#selection-screen";
  setHistoryView("runner");
  beginRunner(order);
}

function beginRunner(order){
  state.runOrder = order;
  state.results = {};
  state.currentIndex = 0;
  el("#selection-screen").classList.add("hidden");
  el("#results-screen").classList.add("hidden");
  runner.classList.remove("hidden");
  requestFullscreenSafe();
  showTestAt(0);
  armAutoHide();
}

function requestFullscreenSafe(){
  const rf = runner.requestFullscreen || runner.webkitRequestFullscreen || runner.msRequestFullscreen;
  if(rf){ rf.call(runner).catch(()=>{ /* fallback: fixed-position overlay already covers viewport */ }); }
}
function exitFullscreenSafe(){
  if(document.fullscreenElement || document.webkitFullscreenElement){
    const ef = document.exitFullscreen || document.webkitExitFullscreen;
    if(ef) ef.call(document).catch(()=>{});
  }
}

function currentTestId(){ return state.runOrder[state.currentIndex]; }

function showTestAt(index){
  if(state.currentTeardown){ try{ state.currentTeardown(); }catch(e){} state.currentTeardown = null; }
  state.currentIndex = Math.max(0, Math.min(index, state.runOrder.length - 1));
  const id = currentTestId();
  const test = TEST_MAP[id];
  stage.innerHTML = "";
  stage.className = "";

  el("#progress-chip").innerHTML = `Test ${state.currentIndex+1} of ${state.runOrder.length}<span class="test-title">${test.name}</span>`;
  el("#btn-prev").disabled = state.currentIndex === 0;

  const renderFn = RENDERERS[test.renderer];
  if(renderFn){
    state.currentTeardown = renderFn(stage, test) || null;
  }
}

function markAndAdvance(status){
  const id = currentTestId();
  state.results[id] = status;
  goNext();
}
function goNext(){
  if(state.currentIndex >= state.runOrder.length - 1){
    finishRun();
  } else {
    showTestAt(state.currentIndex + 1);
  }
}
function goPrev(){
  if(state.currentIndex > 0) showTestAt(state.currentIndex - 1);
}

el("#btn-good").addEventListener("click", () => markAndAdvance("passed"));
el("#btn-problem").addEventListener("click", () => markAndAdvance("problem"));
el("#btn-skip").addEventListener("click", () => markAndAdvance("skipped"));
el("#btn-next").addEventListener("click", goNext);
el("#btn-prev").addEventListener("click", goPrev);

function exitRunnerNow(){
  if(runner.classList.contains("hidden")) return; // already exited — nothing to do
  closeModal("#exit-modal-overlay");
  if(currentHistoryView() === "runner"){
    history.back();
    return;
  }
  runner.classList.add("hidden");
  stopRunner();
  if(state.entryScreen) el(state.entryScreen).classList.remove("hidden");
}

el("#exit-cancel-btn").addEventListener("click", () => closeModal("#exit-modal-overlay"));
el("#exit-confirm-btn").addEventListener("click", exitRunnerNow);

/* Browsers exit native fullscreen on their own — Escape key, a mobile
   swipe-down/back gesture, closing the tab's fullscreen bar, etc. — and
   that happens whether or not our own Escape handler below gets a
   chance to run (some browsers swallow that keydown entirely). This
   listens for the browser's own fullscreen state instead, so the test
   screen always closes properly no matter how fullscreen was exited. */
function onNativeFullscreenChange(){
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
  if(!isFs) exitRunnerNow();
}
document.addEventListener("fullscreenchange", onNativeFullscreenChange);
document.addEventListener("webkitfullscreenchange", onNativeFullscreenChange);
document.addEventListener("MSFullscreenChange", onNativeFullscreenChange);

function stopRunner(){
  if(state.currentTeardown){ try{ state.currentTeardown(); }catch(e){} state.currentTeardown = null; }
  exitFullscreenSafe();
  clearTimeout(state.hideTimer);
  setControlsHidden(false);
}

function finishRun(){
  stopRunner();
  runner.classList.add("hidden");
  renderResultsScreen();
  el("#results-screen").classList.remove("hidden");
  setHistoryView("results", "replace");
  try{
    if(isHeadless) el("#results-screen").scrollTop = 0;
    else if(state.fromSequence) el("#results-screen").scrollIntoView({behavior:"smooth", block:"start"});
  }catch(e){}
}

/* Keyboard shortcuts while runner is active */
document.addEventListener("keydown", (e) => {
  if(runner.classList.contains("hidden")) return;
  if(!el("#exit-modal-overlay").classList.contains("hidden")) return;
  if(e.key === "ArrowLeft") goPrev();
  else if(e.key === "ArrowRight") goNext();
  else if(e.key === " "){ e.preventDefault(); goNext(); }
  else if(e.key === "Escape") showModal("#exit-modal-overlay");
  wakeControls();
});

/* Bottom navigation can be hidden or restored with the persistent arrow. */
const controlsToggle = el("#stt-v102-runner-controls-toggle");

function setControlsHidden(hidden){
  state.controlsHidden = hidden;
  runner.classList.toggle("stt-v102-controls-hidden", hidden);
  if(controlsToggle){
    controlsToggle.setAttribute("aria-expanded", hidden ? "false" : "true");
    controlsToggle.setAttribute("aria-label", hidden ? "Show test navigation" : "Hide test navigation");
    controlsToggle.title = hidden ? "Show test navigation" : "Hide test navigation";
  }
}

function armAutoHide(){
  clearTimeout(state.hideTimer);
  state.hideTimer = setTimeout(() => setControlsHidden(true), 3200);
}
function wakeControls(){
  setControlsHidden(false);
  armAutoHide();
}

if(controlsToggle){
  controlsToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if(state.controlsHidden) wakeControls();
    else {
      clearTimeout(state.hideTimer);
      setControlsHidden(true);
    }
  });
}

/* Desktop pointer movement keeps visible controls awake. Once hidden,
   the arrow remains the explicit way to restore them on every device. */
runner.addEventListener("pointermove", () => {
  if(!state.controlsHidden) armAutoHide();
});

/* Swipe navigation (disabled during touch-family tests to avoid conflicts) */
stage.addEventListener("pointerdown", (e) => {
  const test = TEST_MAP[currentTestId()];
  if(test && test.category === "Touch") return;
  state.swipe = { x: e.clientX, y: e.clientY, t: Date.now() };
});
stage.addEventListener("pointerup", (e) => {
  const test = TEST_MAP[currentTestId()];
  if(test && test.category === "Touch") return;
  if(!state.swipe) return;
  const dx = e.clientX - state.swipe.x;
  const dy = e.clientY - state.swipe.y;
  const dt = Date.now() - state.swipe.t;
  state.swipe = null;
  if(dt < 600 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)*1.5){
    if(dx < 0) goNext(); else goPrev();
  }
});

/* ---------------------------------------------------------------------
   6. RENDERERS
   Each renderer(stage, test) mounts UI into `stage` and returns a
   teardown function that removes listeners / cancels loops.
--------------------------------------------------------------------- */
const RENDERERS = {};

function addCaption(stage, text){
  const c = document.createElement("div");
  c.className = "stage-caption";
  c.textContent = text;
  stage.appendChild(c);
  return c;
}
function addLabel(stage, text){
  const l = document.createElement("div");
  l.className = "stage-label";
  l.textContent = text;
  stage.appendChild(l);
  return l;
}
function colorName(hex){
  const map = {
    "#FFFFFF":"White", "#000000":"Black", "#FF0000":"Red", "#00FF00":"Green", "#0000FF":"Blue",
    "#808080":"Gray 50%", "#404040":"Gray 25%", "#C0C0C0":"Gray 75%", "#202020":"Gray 12%", "#E0E0E0":"Gray 88%",
    "#101010":"Gray 6%", "#303030":"Gray 19%", "#505050":"Gray 31%", "#707070":"Gray 44%",
    "#050505":"Near black 2%", "#0A0A0A":"Near black 4%", "#141414":"Near black 8%"
  };
  return map[hex.toUpperCase()] || hex.toUpperCase();
}

/* ---- SOLID / color-cycle fill (dead/stuck pixel, white/black/RGB, uniformity, OLED levels) ---- */
RENDERERS.solid = function(stage, test){
  const colors = test.params.colors;
  let idx = 0;
  const fill = document.createElement("div");
  fill.className = "stage-fill";
  stage.appendChild(fill);

  let grid = null;
  if(test.params.overlayGrid){
    grid = document.createElement("div");
    grid.style.cssText = "position:absolute;inset:0;background-image:linear-gradient(rgba(0,0,0,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.06) 1px,transparent 1px);background-size:12.5% 12.5%;pointer-events:none;";
    stage.appendChild(grid);
  }

  const label = addLabel(stage, "");
  function paint(){
    fill.style.background = colors[idx];
    label.textContent = colors.length > 1
      ? `${colorName(colors[idx])} — tap or press C to cycle (${idx+1}/${colors.length})`
      : colorName(colors[idx]);
  }
  paint();

  function cycle(){ idx = (idx+1) % colors.length; paint(); }
  function onClick(e){ if(colors.length>1) cycle(); }
  function onKey(e){ if(e.key.toLowerCase()==="c" && colors.length>1) cycle(); }
  stage.addEventListener("click", onClick);
  document.addEventListener("keydown", onKey);

  return () => {
    stage.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onKey);
  };
};

/* ---- PATTERN family: testpattern, subpixel, pixelgrid, sharpness, resolution, moire, checkerboard, fineLines, text ---- */
RENDERERS.pattern = function(stage, test){
  const variant = test.params.variant;
  const wrap = document.createElement("div");
  wrap.className = "stage-fill";
  wrap.style.background = "#000";
  stage.appendChild(wrap);

  const canvas = document.createElement("canvas");
  wrap.appendChild(canvas);
  const dpr = window.devicePixelRatio || 1;
  function size(){
    const r = wrap.getBoundingClientRect();
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
    canvas.style.width = r.width+"px";
    canvas.style.height = r.height+"px";
  }
  size();
  const ctx = canvas.getContext("2d");

  function drawTestPattern(){
    const w = canvas.width, h = canvas.height;
    const bars = ["#FFFFFF","#FFFF00","#00FFFF","#00FF00","#FF00FF","#FF0000","#0000FF","#000000"];
    const bw = w/bars.length;
    bars.forEach((c,i)=>{ ctx.fillStyle=c; ctx.fillRect(i*bw,0,bw+1,h*0.6); });
    const steps = 10;
    const sw = w/steps;
    for(let i=0;i<steps;i++){
      const v = Math.round(255*i/(steps-1));
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(i*sw,h*0.6,sw+1,h*0.25);
    }
    ctx.strokeStyle="rgba(255,255,255,0.5)"; ctx.lineWidth=1*dpr;
    const gs = 24*dpr;
    ctx.beginPath();
    for(let x=0;x<w;x+=gs){ ctx.moveTo(x,h*0.85); ctx.lineTo(x,h); }
    for(let y=h*0.85;y<h;y+=gs){ ctx.moveTo(0,y); ctx.lineTo(w,y); }
    ctx.stroke();
  }
  function drawSubpixel(){
    const w=canvas.width,h=canvas.height;
    const stripeW = Math.max(3*dpr, w/220);
    const cols = ["#FF0000","#00FF00","#0000FF"];
    let x=0,i=0;
    while(x<w){ ctx.fillStyle=cols[i%3]; ctx.fillRect(x,0,stripeW,h); x+=stripeW; i++; }
  }
  function drawPixelGrid(){
    ctx.fillStyle="#000"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle="#fff"; ctx.lineWidth = Math.max(1, Math.floor(dpr));
    const gs = 10*dpr;
    ctx.beginPath();
    for(let x=0;x<canvas.width;x+=gs){ ctx.moveTo(x+0.5,0); ctx.lineTo(x+0.5,canvas.height); }
    for(let y=0;y<canvas.height;y+=gs){ ctx.moveTo(0,y+0.5); ctx.lineTo(canvas.width,y+0.5); }
    ctx.stroke();
  }
  function drawChecker(size){
    const w=canvas.width,h=canvas.height, s=size*dpr;
    for(let y=0;y<h;y+=s){
      for(let x=0;x<w;x+=s){
        const on = ((x/s|0)+(y/s|0))%2===0;
        ctx.fillStyle = on ? "#fff":"#000";
        ctx.fillRect(x,y,s,s);
      }
    }
  }
  function drawMoire(){
    ctx.fillStyle="#000"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle="#fff"; ctx.lineWidth=1;
    const step=2*dpr;
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.rotate(0.15);
    ctx.beginPath();
    for(let x=-canvas.width;x<canvas.width;x+=step){ ctx.moveTo(x,-canvas.height); ctx.lineTo(x,canvas.height); }
    ctx.stroke();
    ctx.restore();
  }
  function drawFineLines(){
    ctx.fillStyle="#000"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#fff";
    let y = 20*dpr;
    [1,2,3].forEach(px=>{
      const lw = px*dpr;
      for(let i=0;i<14;i++){ ctx.fillRect(20*dpr + i*(lw*2+4*dpr), y, lw, 120*dpr); }
      y += 150*dpr;
    });
    // vertical stack of horizontal lines too
    let x = canvas.width - 220*dpr;
    y = 20*dpr;
    [1,2,3].forEach(px=>{
      const lh = px*dpr;
      for(let i=0;i<14;i++){ ctx.fillRect(x, y + i*(lh*2+4*dpr), 160*dpr, lh); }
      y += 0;
      x = x; // keep column
    });
  }
  function drawSharpness(){
    ctx.fillStyle="#000"; ctx.fillRect(0,0,canvas.width,canvas.height);
    const cx=canvas.width/2, cy=canvas.height/2, R=Math.min(cx,cy)*0.92;
    const spokes=72;
    ctx.fillStyle="#fff";
    for(let i=0;i<spokes;i++){
      const a0 = (i/spokes)*Math.PI*2, a1=((i+0.5)/spokes)*Math.PI*2;
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,R,a0,a1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle="#000"; ctx.beginPath(); ctx.arc(cx,cy,R*0.04,0,7); ctx.fill();
  }
  function drawText(){
    ctx.fillStyle="#000"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#fff"; ctx.textBaseline="top";
    const sizes=[10,12,14,18,24,32,48];
    let y=16*dpr;
    sizes.forEach(s=>{
      ctx.font = `${s*dpr}px Inter, sans-serif`;
      ctx.fillText("The quick brown fox jumps 0123456789", 16*dpr, y);
      y += s*dpr*1.7;
    });
  }
  function drawResolutionInfo(){
    drawPixelGrid();
    ctx.fillStyle="rgba(0,0,0,0.55)";
    ctx.fillRect(0, canvas.height-60*dpr, canvas.width, 60*dpr);
    ctx.fillStyle="#fff"; ctx.font=`${14*dpr}px Inter, sans-serif`; ctx.textBaseline="middle";
    const info = `${window.screen.width}×${window.screen.height} logical · ${Math.round(window.screen.width*dpr)}×${Math.round(window.screen.height*dpr)} physical px · DPR ${dpr}`;
    ctx.fillText(info, 16*dpr, canvas.height-30*dpr);
  }

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(variant==="testpattern") drawTestPattern();
    else if(variant==="subpixel") drawSubpixel();
    else if(variant==="pixelgrid") drawPixelGrid();
    else if(variant==="checkerboard") drawChecker(40);
    else if(variant==="moire") drawMoire();
    else if(variant==="fineLines") drawFineLines();
    else if(variant==="sharpness") drawSharpness();
    else if(variant==="text") drawText();
    else if(variant==="resolution") drawResolutionInfo();
  }
  draw();
  function onResize(){ size(); draw(); }
  window.addEventListener("resize", onResize);

  const captions = {
    testpattern:"Color bars, grayscale steps and a pixel grid in one view.",
    subpixel:"Zoom in (or view closely) to inspect individual red/green/blue sub-pixel stripes.",
    pixelgrid:"Look for warped, misaligned or missing grid lines.",
    checkerboard:"Look for shimmering, blur, or uneven squares.",
    moire:"Look for wavy interference patterns layered over the straight lines.",
    fineLines:"Compare the 1px, 2px and 3px line groups for crispness.",
    sharpness:"Lines should stay sharp and distinct all the way to the center.",
    text:"Check for fuzzy edges or color fringing on the smallest text.",
    resolution:"Confirm the reported resolution matches your display's native resolution."
  };
  const cap = addCaption(stage, captions[variant] || "");

  return () => { window.removeEventListener("resize", onResize); };
};

/* ---- COLOR SWATCHES: hues, distances, accuracy, saturation ---- */
RENDERERS.colorSwatches = function(stage, test){
  const mode = test.params.mode;
  const grid = document.createElement("div");
  grid.className = "swatch-grid";
  stage.appendChild(grid);

  let cells = [];
  if(mode === "hues"){
    grid.style.gridTemplateColumns = "repeat(8,1fr)";
    grid.style.gridTemplateRows = "repeat(4,1fr)";
    for(let i=0;i<32;i++){
      const hue = Math.round((i/32)*360);
      cells.push({ bg:`hsl(${hue},85%,50%)`, label:`${hue}°` });
    }
  } else if(mode === "distances"){
    grid.style.gridTemplateColumns = "repeat(6,1fr)";
    grid.style.gridTemplateRows = "repeat(4,1fr)";
    const bases = [10,50,90,130,170,210,250,290,330,20,60,100];
    bases.slice(0,24).forEach((hue,i)=>{
      const l = 45 + (i%2)*4;
      cells.push({ bg:`hsl(${hue},70%,${l}%)`, label:"" });
    });
  } else if(mode === "accuracy"){
    grid.style.gridTemplateColumns = "repeat(4,1fr)";
    grid.style.gridTemplateRows = "repeat(2,1fr)";
    const refs = [
      {bg:"#E8B89B", label:"Skin tone"}, {bg:"#4C86C6", label:"Sky blue"},
      {bg:"#3C8A4C", label:"Grass green"}, {bg:"#F5F0E1", label:"Warm white"},
      {bg:"#C24B4B", label:"Apple red"}, {bg:"#E8D24C", label:"Banana yellow"},
      {bg:"#7A6248", label:"Wood brown"}, {bg:"#8A8F99", label:"Neutral gray"}
    ];
    cells = refs;
  } else if(mode === "saturation"){
    grid.style.gridTemplateColumns = "repeat(8,1fr)";
    grid.style.gridTemplateRows = "repeat(4,1fr)";
    const hues=[0,40,90,160,200,260,300,330];
    hues.forEach(hue=>{
      for(let s=0;s<4;s++){
        cells.push({ bg:`hsl(${hue},${20+s*27}%,50%)`, label: s===3?`${hue}°`:"" });
      }
    });
  }
  cells.forEach(c => {
    const cell = document.createElement("div");
    cell.className = "swatch-cell";
    cell.style.background = c.bg;
    if(c.label) cell.innerHTML = `<span>${c.label}</span>`;
    grid.appendChild(cell);
  });

  const captions = {
    hues:"Look for a hue that appears discolored, banded, or out of sequence.",
    distances:"Neighboring swatches should look distinct — if they blend together, color separation may be limited.",
    accuracy:"Compare each swatch to how that color looks in real life.",
    saturation:"Each row should progress smoothly from muted to vivid without sudden jumps or clipping."
  };
  addCaption(stage, captions[mode] || "");
  return null;
};

/* ---- GRADIENT: multi (bw/r/g/b cycle), banding ---- */
RENDERERS.gradient = function(stage, test){
  const variant = test.params.variant;
  const fill = document.createElement("div");
  fill.className = "stage-fill";
  stage.appendChild(fill);

  if(variant === "banding"){
    fill.style.background = "linear-gradient(90deg, #000000, #ffffff)";
    addCaption(stage, "Look for visible stripes or bands rather than a perfectly smooth transition.");
    return null;
  }

  const gradients = [
    { css:"linear-gradient(90deg,#000000,#ffffff)", label:"Black → White" },
    { css:"linear-gradient(90deg,#000000,#ff0000)", label:"Black → Red" },
    { css:"linear-gradient(90deg,#000000,#00ff00)", label:"Black → Green" },
    { css:"linear-gradient(90deg,#000000,#0000ff)", label:"Black → Blue" }
  ];
  let idx = 0;
  const label = addLabel(stage, "");
  function paint(){ fill.style.background = gradients[idx].css; label.textContent = `${gradients[idx].label} — tap to cycle (${idx+1}/${gradients.length})`; }
  paint();
  function onClick(){ idx=(idx+1)%gradients.length; paint(); }
  stage.addEventListener("click", onClick);
  addCaption(stage, "Transitions should look smooth, without banding or a color cast.");
  return () => stage.removeEventListener("click", onClick);
};

/* ---- CONTRAST ---- */
RENDERERS.contrast = function(stage, test){
  const wrap = document.createElement("div");
  wrap.className = "stage-fill";
  wrap.style.display = "grid";
  wrap.style.gridTemplateColumns = "repeat(4,1fr)";
  wrap.style.gridTemplateRows = "repeat(2,1fr)";
  stage.appendChild(wrap);
  const sizes = [50,50,50,50,50,50,50,50];
  for(let i=0;i<8;i++){
    const cell = document.createElement("div");
    const isWhite = i%2===0;
    cell.style.background = isWhite ? "#fff" : "#000";
    cell.style.display="flex"; cell.style.alignItems="center"; cell.style.justifyContent="center";
    if(i<4){
      const inner = document.createElement("div");
      const pct = 60 - i*12;
      inner.style.width = pct+"%"; inner.style.height = pct+"%";
      inner.style.background = isWhite ? "#000" : "#fff";
      cell.appendChild(inner);
    }
    wrap.appendChild(cell);
  }
  addCaption(stage, "Edges between black and white should stay crisp at every block size, with no gray halo.");
  return null;
};

/* ---- GAMMA ---- */
RENDERERS.gamma = function(stage, test){
  const wrap = document.createElement("div");
  wrap.className = "stage-fill";
  wrap.style.background = "#000";
  wrap.style.display = "grid";
  wrap.style.gridTemplateColumns = "repeat(3,1fr)";
  stage.appendChild(wrap);
  const gammas = [1.8, 2.2, 2.4];
  gammas.forEach(g => {
    const col = document.createElement("div");
    col.style.cssText = "position:relative;display:flex;align-items:center;justify-content:center;";
    const patch = document.createElement("canvas");
    patch.width = 220; patch.height = 220;
    col.appendChild(patch);
    const ctx = patch.getContext("2d");
    // striped pattern approximating mid-gray at this gamma when viewed from a distance
    const grayVal = Math.round(255 * Math.pow(0.5, 1/g));
    for(let y=0;y<220;y++){
      for(let x=0;x<220;x++){
        const on = (x+y)%2===0;
        ctx.fillStyle = on ? "#ffffff":"#000000";
        ctx.fillRect(x,y,1,1);
      }
    }
    const label = document.createElement("div");
    label.style.cssText = "position:absolute;bottom:-30px;left:0;right:0;text-align:center;font-size:13px;color:rgba(255,255,255,0.75);";
    label.textContent = `Gamma ${g}`;
    col.appendChild(label);
    wrap.appendChild(col);
  });
  addCaption(stage, "From a normal viewing distance, the patch whose stripes blend most smoothly into flat gray indicates your display's gamma.");
  return null;
};

/* ---- BRIGHTNESS steps ---- */
RENDERERS.brightness = function(stage, test){
  const row = document.createElement("div");
  row.className = "brightness-row";
  stage.appendChild(row);
  const steps = 10;
  for(let i=0;i<steps;i++){
    const seg = document.createElement("div");
    seg.className = "brightness-seg";
    const v = Math.round(255*i/(steps-1));
    seg.style.background = `rgb(${v},${v},${v})`;
    const span = document.createElement("span");
    span.textContent = Math.round(i/(steps-1)*100)+"%";
    span.style.color = v>140 ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.55)";
    seg.appendChild(span);
    row.appendChild(seg);
  }
  addCaption(stage, "Each step should be distinguishable from its neighbors, especially near the dark end.");
  return null;
};

/* ---- BURN-IN cycling ---- */
RENDERERS.burnIn = function(stage, test){
  const fill = document.createElement("div");
  fill.className = "stage-fill";
  stage.appendChild(fill);
  const seq = ["#FF0000","#00FF00","#0000FF","#FFFFFF","#000000"];
  let idx = 0;
  const label = addLabel(stage, "");
  function paint(){ fill.style.background = seq[idx]; label.textContent = `${colorName(seq[idx])} — auto-advances, or tap to cycle (${idx+1}/${seq.length})`; }
  paint();
  const timer = setInterval(()=>{ idx=(idx+1)%seq.length; paint(); }, 4000);
  function onClick(){ idx=(idx+1)%seq.length; paint(); }
  stage.addEventListener("click", onClick);
  addCaption(stage, "Watch for any ghost of a previous image lingering as colors change.");
  return () => { clearInterval(timer); stage.removeEventListener("click", onClick); };
};

/* ---- IMAGE RETENTION: flash pattern then flat fields ---- */
RENDERERS.imageRetention = function(stage, test){
  const fill = document.createElement("div");
  fill.className = "stage-fill";
  stage.appendChild(fill);
  const canvas = document.createElement("canvas");
  canvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;";
  stage.appendChild(canvas);
  const dpr = window.devicePixelRatio||1;
  const r = stage.getBoundingClientRect();
  canvas.width = r.width*dpr; canvas.height=r.height*dpr;
  const ctx = canvas.getContext("2d");

  function drawStaticPattern(){
    ctx.fillStyle="#000"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#fff";
    ctx.font = `bold ${Math.round(canvas.width*0.09)}px Inter, sans-serif`;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("SCREEN TEST", canvas.width/2, canvas.height/2);
    ctx.strokeStyle="#fff"; ctx.lineWidth=6*dpr; ctx.strokeRect(40*dpr,40*dpr,canvas.width-80*dpr,canvas.height-80*dpr);
  }
  drawStaticPattern();
  fill.style.background = "#000";
  const label = addLabel(stage, "Displaying static pattern for 6 seconds...");

  let phase = 0;
  const t1 = setTimeout(()=>{
    canvas.remove();
    fill.style.background = "#808080";
    phase = 1;
    label.textContent = "Now showing flat gray — look for a lingering ghost image.";
  }, 6000);
  const t2 = setTimeout(()=>{
    fill.style.background = "#ffffff";
    phase = 2;
    label.textContent = "Now showing flat white — check again for any retained image.";
  }, 12000);

  addCaption(stage, "A brief afterimage that fades within seconds is normal. One that persists may indicate image retention.");
  return () => { clearTimeout(t1); clearTimeout(t2); };
};

/* ---- VIEWING ANGLE ---- */
RENDERERS.viewingAngle = function(stage, test){
  const wrap = document.createElement("div");
  wrap.className = "stage-fill";
  wrap.style.display="flex"; wrap.style.flexDirection="column";
  stage.appendChild(wrap);
  const bands = ["#FF0000","#FFFFFF","#00FF00","#000000","#0000FF","#FFFF00"];
  bands.forEach(c=>{
    const b = document.createElement("div");
    b.style.cssText = `flex:1;background:${c};`;
    wrap.appendChild(b);
  });
  addCaption(stage, "Now tilt your head or the device — view from left, right, above and below. Note where colors wash out or invert.");
  return null;
};

/* ---- ORIENTATION ---- */
RENDERERS.orientation = function(stage, test){
  const wrap = document.createElement("div");
  wrap.className = "stage-fill";
  wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:#0c0e1a;";
  stage.appendChild(wrap);
  const big = document.createElement("div");
  big.style.cssText = "font-size:15vw;font-weight:700;font-family:'Space Grotesk',sans-serif;";
  const sub = document.createElement("div");
  sub.style.cssText = "font-size:16px;color:rgba(255,255,255,0.6);";
  wrap.appendChild(big); wrap.appendChild(sub);

  function readOrientation(){
    let type = "unknown";
    if(screen.orientation && screen.orientation.type) type = screen.orientation.type;
    else if(typeof window.orientation === "number"){
      type = (Math.abs(window.orientation)===90) ? "landscape" : "portrait";
    } else {
      type = window.innerWidth > window.innerHeight ? "landscape" : "portrait";
    }
    return type;
  }
  function update(){
    const type = readOrientation();
    big.textContent = type.includes("landscape") ? "LANDSCAPE" : "PORTRAIT";
    sub.textContent = `Reported orientation: ${type}`;
  }
  update();
  window.addEventListener("resize", update);
  if(screen.orientation) screen.orientation.addEventListener("change", update);

  const captions = {
    basic:"Rotate your device (or resize the window on desktop) to confirm this updates correctly.",
    autorotate:"Physically rotate your device now. If this label doesn't update, auto-rotate may be off or locked."
  };
  addCaption(stage, captions[test.params.variant] || captions.basic);
  return () => {
    window.removeEventListener("resize", update);
    if(screen.orientation) screen.orientation.removeEventListener("change", update);
  };
};

/* ---- TOUCH GRID ---- */
RENDERERS.touchGrid = function(stage, test){
  const { rows, cols, mode, showReset } = test.params;
  const isSwipe = mode === "swipe";
  const grid = document.createElement("div");
  grid.className = "touch-grid";
  grid.style.gridTemplateColumns = `repeat(${cols},1fr)`;
  grid.style.gridTemplateRows = `repeat(${rows},1fr)`;
  stage.appendChild(grid);

  const total = rows*cols;
  let hitCount = 0;
  const startTime = performance.now();
  const cells = [];
  for(let i=0;i<total;i++){
    const cell = document.createElement("div");
    cell.className = "touch-cell";
    grid.appendChild(cell);
    cells.push(cell);
  }
  const label = addLabel(stage, "");
  function updateLabel(){
    label.textContent = isSwipe
      ? `${hitCount} / ${total} cells covered`
      : `${hitCount} / ${total} cells tested`;
  }
  updateLabel();

  function markCell(cell){
    if(!cell || !cell.classList || !cell.classList.contains("touch-cell") || cell.classList.contains("hit")) return;
    cell.classList.add("hit");
    hitCount++;
    if(!isSwipe){
      const elapsed = Math.round(performance.now() - startTime);
      cell.textContent = `${elapsed}ms`;
    }
    updateLabel();
  }

  let dragging = false;
  function onDown(e){
    dragging = true;
    markCell(e.target.closest(".touch-cell"));
  }
  function onMove(e){
    if(!isSwipe || !dragging) return;
    const el2 = document.elementFromPoint(e.clientX, e.clientY);
    markCell(el2 && el2.closest ? el2.closest(".touch-cell") : null);
  }
  function onUp(){ dragging = false; }

  grid.addEventListener("pointerdown", onDown);
  if(isSwipe){
    grid.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  let resetBtn = null;
  function doReset(){
    cells.forEach(c => { c.classList.remove("hit"); c.textContent = ""; });
    hitCount = 0;
    updateLabel();
  }
  if(showReset){
    resetBtn = document.createElement("button");
    resetBtn.textContent = "Reset";
    resetBtn.style.cssText = "position:absolute;top:64px;right:16px;z-index:15;background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);padding:8px 14px;border-radius:9px;font-size:13px;cursor:pointer;";
    resetBtn.addEventListener("click", doReset);
    stage.appendChild(resetBtn);
  }

  addCaption(stage, isSwipe
    ? "Swipe finger to cover all cells — detect dead zones"
    : "Tap every cell. Untested cells may indicate an unresponsive touch zone.");

  return () => {
    grid.removeEventListener("pointerdown", onDown);
    if(isSwipe){
      grid.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }
  };
};

/* ---- TOUCH LINE (freehand draw) ---- */
RENDERERS.touchLine = function(stage, test){
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;background:#000;";
  stage.appendChild(canvas);
  const dpr = window.devicePixelRatio||1;
  function size(){
    const r = stage.getBoundingClientRect();
    canvas.width = r.width*dpr; canvas.height = r.height*dpr;
  }
  size();
  const ctx = canvas.getContext("2d");
  ctx.strokeStyle = "#5CF0C0"; ctx.lineWidth = 4*dpr; ctx.lineCap="round"; ctx.lineJoin="round";
  let drawing=false, lastX=0,lastY=0;
  function pos(e){
    const r = canvas.getBoundingClientRect();
    return [(e.clientX-r.left)*dpr, (e.clientY-r.top)*dpr];
  }
  function down(e){ drawing=true; [lastX,lastY]=pos(e); ctx.beginPath(); ctx.arc(lastX,lastY,2*dpr,0,7); ctx.fill(); }
  function move(e){ if(!drawing) return; const [x,y]=pos(e); ctx.beginPath(); ctx.moveTo(lastX,lastY); ctx.lineTo(x,y); ctx.stroke(); lastX=x; lastY=y; }
  function up(){ drawing=false; }
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("resize", size);

  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Clear";
  clearBtn.style.cssText = "position:absolute;top:64px;right:16px;z-index:15;background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);padding:8px 14px;border-radius:9px;font-size:13px;cursor:pointer;";
  clearBtn.addEventListener("click", ()=> ctx.clearRect(0,0,canvas.width,canvas.height));
  stage.appendChild(clearBtn);

  addCaption(stage, "Drag continuously across the whole screen. Gaps in the line reveal tracking dropouts.");
  return () => {
    canvas.removeEventListener("pointerdown", down);
    canvas.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("resize", size);
  };
};

/* ---- MULTI-TOUCH ---- */
RENDERERS.multiTouch = function(stage, test){
  const wrap = document.createElement("div");
  wrap.className = "stage-fill";
  wrap.style.background = "#0c0e1a";
  stage.appendChild(wrap);
  const active = new Map();

  function makeDot(id, x, y){
    const dot = document.createElement("div");
    dot.style.cssText = `position:absolute;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;background:rgba(76,95,217,0.35);border:2px solid #4C5FD9;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:600;pointer-events:none;`;
    dot.style.left = x+"px"; dot.style.top = y+"px";
    dot.textContent = "Finger " + id;
    wrap.appendChild(dot);
    return dot;
  }
  let counter = 0;
  const idLabels = new Map();
  function down(e){
    counter++;
    idLabels.set(e.pointerId, counter);
    const dot = makeDot(counter, e.clientX, e.clientY);
    active.set(e.pointerId, dot);
  }
  function move(e){
    const dot = active.get(e.pointerId);
    if(!dot) return;
    dot.style.left = e.clientX+"px"; dot.style.top = e.clientY+"px";
  }
  function up(e){
    const dot = active.get(e.pointerId);
    if(dot) dot.remove();
    active.delete(e.pointerId);
  }
  wrap.addEventListener("pointerdown", down);
  wrap.addEventListener("pointermove", move);
  wrap.addEventListener("pointerup", up);
  wrap.addEventListener("pointercancel", up);
  addCaption(stage, "Place multiple fingers on the screen at once — each should get its own labeled marker.");
  return () => {
    wrap.removeEventListener("pointerdown", down);
    wrap.removeEventListener("pointermove", move);
    wrap.removeEventListener("pointerup", up);
    wrap.removeEventListener("pointercancel", up);
  };
};

/* ---- TOUCH ZONE family: basic, accuracy, sensitivity, edge, corner, ghost, latency ---- */
RENDERERS.touchZone = function(stage, test){
  const variant = test.params.variant;
  const wrap = document.createElement("div");
  wrap.className = "stage-fill";
  wrap.style.background = "#0c0e1a";
  stage.appendChild(wrap);

  const overlay = document.createElement("div");
  overlay.style.cssText = "position:absolute;inset:0;";
  wrap.appendChild(overlay);

  let teardownExtra = () => {};
  const label = addLabel(stage, "");

  if(variant === "basic"){
    let taps = 0;
    function tap(e){
      taps++;
      dropMarker(overlay, e.clientX, e.clientY, "#5CF0C0");
      label.textContent = `${taps} tap${taps===1?"":"s"} registered`;
    }
    label.textContent = "0 taps registered";
    wrap.addEventListener("pointerdown", tap);
    teardownExtra = () => wrap.removeEventListener("pointerdown", tap);
    addCaption(stage, "Tap anywhere. Every tap should leave a mark.");
  }

  else if(variant === "accuracy"){
    let hit=0, total=0, offsetSum=0;
    function placeTarget(){
      const r = stage.getBoundingClientRect();
      const x = 60 + Math.random()*(r.width-120);
      const y = 100 + Math.random()*(r.height-220);
      overlay.innerHTML = `<div id="acc-target" style="position:absolute;left:${x}px;top:${y}px;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:2px solid #4C5FD9;display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:50%;background:#4C5FD9;"></div></div>`;
      overlay.dataset.tx = x; overlay.dataset.ty = y;
    }
    placeTarget();
    function tap(e){
      const tx = parseFloat(overlay.dataset.tx), ty = parseFloat(overlay.dataset.ty);
      const d = Math.hypot(e.clientX-tx, e.clientY-ty);
      total++; offsetSum += d;
      if(d < 30) hit++;
      label.textContent = `${hit}/${total} on target · avg offset ${(offsetSum/total).toFixed(0)}px`;
      placeTarget();
    }
    wrap.addEventListener("pointerdown", tap);
    teardownExtra = () => wrap.removeEventListener("pointerdown", tap);
    addCaption(stage, "Tap the center of each target as it appears.");
  }

  else if(variant === "sensitivity"){
    let count=0;
    function tap(e){
      count++;
      dropMarker(overlay, e.clientX, e.clientY, e.pressure ? "#F59E0B" : "#5CF0C0");
      const p = e.pressure && e.pressure>0 ? ` · pressure ${e.pressure.toFixed(2)}` : "";
      label.textContent = `${count} taps${p}`;
    }
    label.textContent = "Try light and firm taps across the screen";
    wrap.addEventListener("pointerdown", tap);
    teardownExtra = () => wrap.removeEventListener("pointerdown", tap);
    addCaption(stage, "Browsers can't measure true pressure on most devices — compare responsiveness by feel instead.");
  }

  else if(variant === "edge" || variant === "corner"){
    const zoneThickness = 46;
    const r0 = stage.getBoundingClientRect();
    if(variant === "edge"){
      ["top","bottom","left","right"].forEach(side=>{
        const z = document.createElement("div");
        z.dataset.zone = side;
        z.style.cssText = `position:absolute;background:rgba(76,95,217,0.18);border:1px dashed rgba(76,95,217,0.6);`;
        if(side==="top"){ z.style.top=0; z.style.left=0; z.style.right=0; z.style.height=zoneThickness+"px"; }
        if(side==="bottom"){ z.style.bottom=0; z.style.left=0; z.style.right=0; z.style.height=zoneThickness+"px"; }
        if(side==="left"){ z.style.top=0; z.style.bottom=0; z.style.left=0; z.style.width=zoneThickness+"px"; }
        if(side==="right"){ z.style.top=0; z.style.bottom=0; z.style.right=0; z.style.width=zoneThickness+"px"; }
        overlay.appendChild(z);
      });
    } else {
      [["top","left"],["top","right"],["bottom","left"],["bottom","right"]].forEach(([v,h])=>{
        const z = document.createElement("div");
        z.dataset.zone = v+"-"+h;
        z.style.cssText = `position:absolute;width:70px;height:70px;background:rgba(76,95,217,0.18);border:1px dashed rgba(76,95,217,0.6);`;
        z.style[v]="0"; z.style[h]="0";
        overlay.appendChild(z);
      });
    }
    const zoneEls = Array.from(overlay.children);
    const totalZones = zoneEls.length;
    function tap(e){
      const z = e.target.closest("[data-zone]");
      if(!z || z.dataset.done) return;
      z.dataset.done = "1";
      z.style.background = "rgba(18,165,103,0.4)";
      z.style.borderColor = "rgba(18,165,103,0.8)";
      const done = zoneEls.filter(x=>x.dataset.done).length;
      label.textContent = `${done}/${totalZones} zones tested`;
    }
    label.textContent = `0/${totalZones} zones tested`;
    overlay.addEventListener("pointerdown", tap);
    teardownExtra = () => overlay.removeEventListener("pointerdown", tap);
    addCaption(stage, variant==="edge" ? "Tap along each highlighted edge strip." : "Tap each highlighted corner zone.");
  }

  else if(variant === "ghost"){
    let events = 0;
    const log = [];
    const logEl = document.createElement("div");
    logEl.style.cssText = "position:absolute;left:16px;right:16px;bottom:100px;max-height:120px;overflow:auto;font-size:11.5px;color:rgba(255,255,255,0.7);text-align:left;background:rgba(0,0,0,0.3);border-radius:10px;padding:8px 12px;";
    stage.appendChild(logEl);
    function onEvt(e){
      events++;
      const t = new Date().toLocaleTimeString();
      log.unshift(`${t} — pointer event at (${Math.round(e.clientX)}, ${Math.round(e.clientY)})`);
      logEl.innerHTML = log.slice(0,6).join("<br>");
      label.textContent = `${events} unexpected event${events===1?"":"s"} logged`;
    }
    label.textContent = "0 unexpected events logged — set the device down without touching it";
    wrap.addEventListener("pointerdown", onEvt);
    teardownExtra = () => wrap.removeEventListener("pointerdown", onEvt);
    addCaption(stage, "This can only log touch events while you're not touching the screen — it can't diagnose the hardware cause of ghost touch.");
  }

  else if(variant === "latency"){
    const target = document.createElement("div");
    target.style.cssText = "position:absolute;left:50%;top:50%;width:90px;height:90px;margin:-45px 0 0 -45px;border-radius:50%;background:#4C5FD9;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:600;";
    target.textContent = "Tap me";
    overlay.appendChild(target);
    let samples = [];
    function tap(e){
      const t0 = e.timeStamp;
      requestAnimationFrame((t1)=>{
        const ms = Math.max(0, t1 - t0);
        samples.push(ms);
        if(samples.length>10) samples.shift();
        const avg = samples.reduce((a,b)=>a+b,0)/samples.length;
        label.textContent = `Last: ${ms.toFixed(1)}ms · avg: ${avg.toFixed(1)}ms (approximate, browser-level)`;
      });
    }
    label.textContent = "Tap the target repeatedly";
    target.addEventListener("pointerdown", tap);
    teardownExtra = () => target.removeEventListener("pointerdown", tap);
    addCaption(stage, "Measures time to the next rendered frame after your tap — not true hardware input latency.");
  }

  return () => teardownExtra();
};

function dropMarker(container, x, y, color){
  const m = document.createElement("div");
  m.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:${color};opacity:0.85;transition:transform .4s ease, opacity .4s ease;`;
  container.appendChild(m);
  requestAnimationFrame(()=>{ m.style.transform="scale(1.8)"; m.style.opacity="0"; });
  setTimeout(()=>m.remove(), 450);
}

/* ---- MOTION family: refresh, basic, ghosting, blur, frames, response ---- */
RENDERERS.motion = function(stage, test){
  const variant = test.params.variant;
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  stage.appendChild(canvas);
  const dpr = window.devicePixelRatio||1;
  function size(){
    const r = stage.getBoundingClientRect();
    canvas.width = r.width*dpr; canvas.height = r.height*dpr;
  }
  size();
  const ctx = canvas.getContext("2d");
  const label = addLabel(stage, "");

  let raf, t=0, lastTs=performance.now();
  let frameCount=0, fpsAccumTime=0, fps=0;
  const speed = variant==="ghosting"||variant==="response" ? 1.6 : 0.9;

  function frame(ts){
    const dt = ts - lastTs; lastTs = ts;
    frameCount++; fpsAccumTime += dt;
    if(fpsAccumTime >= 500){
      fps = Math.round((frameCount*1000)/fpsAccumTime);
      frameCount = 0; fpsAccumTime = 0;
    }
    ctx.fillStyle = (variant==="response") ? (Math.floor(t/40)%2===0 ? "#000":"#fff") : "#000";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    const w = canvas.width, h = canvas.height;
    const barW = variant==="frames" ? w*0.03 : w*0.05;
    const x = ((t*speed) % (w+barW)) - barW;
    ctx.fillStyle = variant==="response" ? (Math.floor(t/40)%2===0 ? "#fff":"#000") : "#5CF0C0";
    if(variant==="ghosting" || variant==="blur"){
      ctx.fillStyle = "#FF3B7A";
    }
    ctx.fillRect(x, 0, barW, h);

    if(variant==="frames"){
      ctx.fillStyle="#fff"; ctx.font=`${16*dpr}px Inter, sans-serif`;
      ctx.fillText(`${fps} fps (measured)`, 16*dpr, 30*dpr);
    }
    if(variant==="refresh"){
      label.textContent = `${fps} fps measured — approximate, not an exact hardware Hz reading`;
    }

    t += 6*dpr;
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  function onResize(){ size(); }
  window.addEventListener("resize", onResize);

  const captions = {
    refresh:"Watch the bar move — smoother motion generally correlates with a higher refresh rate.",
    basic:"Judge how fluid the motion looks as the bar crosses the screen.",
    ghosting:"Watch for a trailing shadow behind the moving bar.",
    blur:"Judge overall sharpness of the object while it's in motion.",
    frames:"The counter shows an approximate, browser-measured frame rate alongside the moving pattern.",
    response:"Watch the alternating edge for smearing or trailing as it moves."
  };
  addCaption(stage, captions[variant] || "");

  return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
};

/* ---------------------------------------------------------------------
   7. RESULTS SCREEN
--------------------------------------------------------------------- */
function renderResultsScreen(){
  const order = state.runOrder;
  const counts = { passed:0, problem:0, skipped:0 };
  order.forEach(id => {
    const st = state.results[id] || "skipped";
    counts[st] = (counts[st]||0) + 1;
  });

  el("#results-summary").innerHTML = `
    <div class="stat-box"><div class="num">${order.length}</div><div class="lbl">Completed</div></div>
    <div class="stat-box"><div class="num" style="color:var(--success)">${counts.passed}</div><div class="lbl">Passed</div></div>
    <div class="stat-box"><div class="num" style="color:var(--danger)">${counts.problem}</div><div class="lbl">Problems</div></div>
    <div class="stat-box"><div class="num" style="color:var(--muted-2)">${counts.skipped}</div><div class="lbl">Skipped</div></div>
  `;

  const listEl = el("#results-list");
  listEl.innerHTML = "";
  order.forEach(id => {
    const t = TEST_MAP[id];
    const st = state.results[id] || "skipped";
    const iconCls = st === "passed" ? "pass" : st === "problem" ? "problem" : "skip";
    const iconSvg = st === "passed"
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`
      : st === "problem"
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 12h14"/></svg>`;
    const statusText = st === "passed" ? "Passed" : st === "problem" ? "Problem found" : "Skipped";
    const row = document.createElement("div");
    row.className = "result-row";
    row.innerHTML = `
      <span class="result-icon ${iconCls}">${iconSvg}</span>
      <span class="result-name">${t.name}</span>
      <span class="result-status ${iconCls==='pass'?'pass':iconCls==='problem'?'problem':''}">${statusText}</span>
    `;
    listEl.appendChild(row);
  });

  el("#run-failed-btn").disabled = counts.problem === 0;
  if(counts.problem === 0){ el("#run-failed-btn").style.opacity = "0.5"; el("#run-failed-btn").style.cursor="not-allowed"; }
  else { el("#run-failed-btn").style.opacity = ""; el("#run-failed-btn").style.cursor=""; }
}

/* ---------------------------------------------------------------------
   INIT
--------------------------------------------------------------------- */
buildCategoryScreen();
buildSelectionScreen();
setHistoryView("category", "replace");
el("#screen-test-app").style.removeProperty("visibility");

window.addEventListener("popstate", (e) => {
  const view = e.state && e.state[HISTORY_KEY];
  if(!view) return;

  els(".modal-overlay:not(.hidden)").forEach(m => m.classList.add("hidden"));

  if(view !== "runner" && !runner.classList.contains("hidden")){
    runner.classList.add("hidden");
    stopRunner();
  }

  ["#category-screen", "#selection-screen", "#results-screen"].forEach(sel => {
    el(sel).classList.add("hidden");
  });

  if(view === "selection"){
    el("#selection-screen").classList.remove("hidden");
  } else if(view === "results"){
    renderResultsScreen();
    el("#results-screen").classList.remove("hidden");
  } else if(view === "runner" && state.runOrder.length){
    runner.classList.remove("hidden");
    showTestAt(state.currentIndex);
    armAutoHide();
  } else {
    el("#category-screen").classList.remove("hidden");
  }
});

} // end boot()

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", boot);
} else {
  // DOM is already parsed (script loaded late/deferred) — run right away
  boot();
}

})();
