# Apple Motion & Liquid Glass Catalog (iOS 26 / macOS 26 "Tahoe")

> A build-ready reference of Apple's animation, morphing, and transition patterns as of the **Liquid Glass** design language (introduced at WWDC, June 9 2025). Intended as the source-of-truth for a **web (CSS/React) reference showcase**. Each effect lists where it appears, step-by-step behavior, a motion spec (timing/easing feel + what property morphs), Liquid Glass traits, and a one-line web-implementability note.

## What "Liquid Glass" is (intro)

Liquid Glass is Apple's unified cross-OS material (iOS 26, iPadOS 26, macOS Tahoe 26, watchOS 26, tvOS 26). It is a real-time-rendered "digital meta-material" that **translucently reflects and refracts its surroundings**, **bends/concentrates light (lensing)**, produces **specular highlights that respond to device motion**, casts **adaptive shadows**, and **dynamically morphs between shapes/controls** as context changes. It has an **inherent gel-like flexibility** — on touch it flexes, illuminates from within under the fingertip, and its glow spreads to neighboring glass. Two variants exist: **Regular** (adaptive, most surfaces) and **Clear** (permanently transparent, needs a dimming layer). It is meant for the **navigation layer only**, floating above the content layer. Accessibility settings (Reduced Transparency, Increased Contrast, Reduced Motion) frost it, add borders, and disable elastic/wobble physics.

Primary sources:
- Apple Newsroom — "Apple introduces a delightful and elegant new software design" — https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/
- WWDC25 Session 219 "Meet Liquid Glass" — https://developer.apple.com/videos/play/wwdc2025/219/
- WWDC25 Session 323 "Build a SwiftUI app with the new design" — https://developer.apple.com/videos/play/wwdc2025/323/
- Apple HIG — Materials — https://developer.apple.com/design/human-interface-guidelines/materials
- WWDC25 Session 337 "What's new in SF Symbols 7" — https://developer.apple.com/videos/play/wwdc2025/337/

**Motion honesty note:** Apple does not publish spring constants, damping, or ms durations for the system animations. Where numbers appear below they are (a) SwiftUI defaults, (b) values reported by reputable reverse-engineering write-ups, or (c) explicitly labeled *inferred from demos/observation*. Treat them as feel targets, not exact APIs.

---

## A. Dynamic Island (flagship)

*Context: the pill around the iPhone front camera, driven by SpringBoard. Three states — Compact (small pieces flanking the camera), Minimal (a tiny detached dot when a 2nd activity is active), Expanded (full card on long-press or major update).* Sources: https://developer.apple.com/documentation/activitykit , https://infinum.com/blog/start-designing-for-dynamic-island-and-live-activities/ , reverse-eng spring values from https://www.sinasamaki.com/dynamic-island/ and https://beui.dev/components/blocks/dynamic-island

1. **Compact → Expanded morph (long-press / major update)**
   - Where: lock/home screen, any Live Activity.
   - Behavior: the compact pill's rounded-rect grows in width and height, corners stay continuous (squircle), interior content cross-fades from glyph/short text to the full expanded layout; background stays pure black so it reads as the hardware cutout stretching.
   - Motion spec: shared-layout spring, slight overshoot, ~0.35–0.5s. Morphs: width, height, corner-radius, position of interior elements; content opacity cross-fade. Reported spring for content swap ≈ stiffness 460 / damping 30 / mass 0.55.
   - Liquid Glass traits: not glass-tinted itself (black), but obeys the same continuous-corner + fluid-morph language.
   - Web: **very feasible** — FLIP or Framer Motion `layout` on a rounded-rect + `AnimatePresence` cross-fade of children. Continuous corners via large border-radius.

2. **Compact ↔ Minimal split/merge (multi-activity)**
   - Where: when a second activity starts, the pill splits into the main pill + a detached circular "dot"; when one ends they merge back.
   - Behavior: a blob detaches from the main island (gooey neck stretches then snaps), settles as a separate dot; reverse absorbs it back.
   - Motion spec: gel/metaball separation, spring with pronounced overshoot ~0.4s. Morphs: shape split, x-position, scale.
   - Liquid Glass traits: metaball merge/separate is the same "gel" behavior as glass containers.
   - Web: **feasible-ish** — SVG goo filter (feGaussianBlur + feColorMatrix contrast) for the neck; two spring-animated circles. The snap is the hard part; approximate.

3. **Minimal dot ↔ Compact expand**
   - Where: tapping the minimal dot promotes that activity back to compact.
   - Behavior: the tiny dot inflates into a compact pill with its glyphs fading in.
   - Motion spec: spring scale from ~0.3→1 with overshoot, ~0.3s; content fade-in delayed ~80ms.
   - Web: **very feasible** — scale + opacity spring.

4. **Incoming activity "widen from camera"**
   - Where: starting a timer, voice memo, call, navigation.
   - Behavior: pill widens outward symmetrically from the camera, glyph slides/pops in from the leading edge.
   - Motion spec: width spring, mild overshoot ~0.35s; icon `bounce`-style entrance.
   - Web: **very feasible** — width transition + icon keyframe.

5. **Live Activity content update (in-place)**
   - Where: score changes, timer ticks, progress.
   - Behavior: numbers roll/flip, progress ring/bar advances, icons swap without resizing the island.
   - Motion spec: SwiftUI `.contentTransition(.numericText())` — digits slide vertically like an odometer; `.push`/`.move` for swaps. ~0.2–0.3s ease.
   - Web: **very feasible** — vertical digit roll (translateY of a stacked digit column), CSS `@property` counter for rings.

6. **Expanded long-press "bloom" + press-down**
   - Where: pressing the expanded island's interactive buttons.
   - Behavior: whole card scales down slightly on touch-down (haptic-synced), buttons flex; release springs back.
   - Motion spec: press spring ≈ stiffness 500 / damping 30 / mass 0.6 (reported); scale to ~0.96 then back.
   - Web: **very feasible** — `active` scale + spring on release.

---

## B. Liquid Glass material — core motion

*Sources: WWDC25 219, HIG Materials, Newsroom (all above).*

7. **Specular highlight sweep (motion/tilt-driven)**
   - Where: every glass control, sheet, icon; especially on device tilt and on lock/unlock.
   - Behavior: a bright specular streak travels along the element's edge/silhouette as the light source (tied to device motion) moves.
   - Motion spec: continuous, position-driven (not time-driven); on lock/unlock it's a one-shot ~0.6–1s travel around the perimeter. Morphs: highlight gradient position/angle.
   - Liquid Glass traits: THE signature — highlights respond to geometry + real-world orientation.
   - Web: **feasible (approximate)** — animated `background: linear-gradient` position or a masked moving highlight; tie to `deviceorientation` / pointer for the tilt version. True per-geometry highlight is hard.

8. **Lensing / refraction of content behind**
   - Where: toolbars, sidebars, tab bars, sheets over scrolling content.
   - Behavior: content seen through the glass is magnified/warped near the edges as if through a real lens; edges bend light inward.
   - Motion spec: continuous while content moves beneath; edge distortion strongest at rim.
   - Liquid Glass traits: core. Edge-bending "lensing" distinct from flat blur.
   - Web: **hard/approximate** — `backdrop-filter: blur()` gives frost but not refraction; real edge-lensing needs an SVG `feDisplacementMap` displacement filter over a snapshot, or WebGL. Ship blur + a subtle edge distortion map.

9. **Edge light-travel on lock / unlock**
   - Where: unlocking the phone, waking.
   - Behavior: light sweeps around each glass element's silhouette, defining its shape, then settles.
   - Motion spec: one-shot ~0.8s, ease-out; highlight position animates around perimeter.
   - Web: **feasible** — conic-gradient border light rotated once via `@property --angle`.

10. **Gel / jelly press wobble ("flex & energize")**
    - Where: any tappable glass control.
    - Behavior: on touch-down the element flexes (squash), illuminates from within starting under the fingertip, glow spreads outward; release springs back with a small jelly wobble.
    - Motion spec: spring with overshoot, ~0.3–0.45s; scale/skew squash + inner radial glow ramp.
    - Liquid Glass traits: "inherent gel-like flexibility," "illuminates from within," glow propagates to neighbors.
    - Web: **feasible** — transform squash spring + radial-gradient glow whose origin = pointer coords (CSS vars); disable under `prefers-reduced-motion`.

11. **Glow spread to neighboring glass**
    - Where: clusters of glass controls (toolbar, Control Center).
    - Behavior: the lit glow from a pressed element reflects onto adjacent glass elements.
    - Motion spec: brief, follows the press; opacity ramp on neighbors ~0.2s.
    - Web: **feasible (approximate)** — sibling elements gain a faint box-shadow/inner glow keyed to the active one.

12. **Adaptive tint mapping**
    - Where: tinted glass buttons/controls over varied backgrounds.
    - Behavior: the glass hue/brightness/saturation shifts a range of tones mapped to the brightness of the content passing beneath — like real colored glass.
    - Motion spec: continuous as background scrolls; subtle.
    - Web: **hard/approximate** — `mix-blend-mode` + `backdrop-filter: saturate()/brightness()`; can't truly sample backdrop luminance in CSS. Approximate with blend modes.

13. **Materialize in / out (glass appear/disappear)**
    - Where: menus, popovers, transient glass appearing.
    - Behavior: element fades in by gradually ramping its light-bending/lensing rather than a plain opacity fade — it "condenses" into being.
    - Motion spec: ~0.3s; blur + saturation + scale(0.98→1) combined, not opacity alone.
    - Web: **feasible** — animate `backdrop-filter` blur + opacity + slight scale together.

14. **Adaptive shadow on scroll**
    - Where: floating toolbars/tab bars as content scrolls under them.
    - Behavior: shadow opacity increases over text (to separate) and decreases over plain light areas; ramps as content scrolls beneath.
    - Motion spec: continuous, tied to scroll; opacity of drop shadow.
    - Web: **feasible** — scroll-linked box-shadow opacity (IntersectionObserver / scroll listener).

15. **Thickening on scale (menu / sidebar grow)**
    - Where: a control expands into a menu or a sidebar widens.
    - Behavior: as glass morphs larger it simulates thicker material — deeper/richer shadow, more pronounced lensing, softer light scattering.
    - Motion spec: coupled to the size morph, ~0.35s.
    - Web: **feasible (approximate)** — interpolate blur radius, shadow depth, and edge-distortion strength with the scale.

16. **GlassEffectContainer proximity merge**
    - Where: SwiftUI `GlassEffectContainer` — clusters of glass buttons (e.g. an expanding toolbar/FAB cluster). Source: https://developer.apple.com/documentation/swiftui/glasseffectcontainer , https://www.createwithswift.com/morphing-glass-effect-elements-into-one-another-with-glasseffectid/
    - Behavior: as two glass shapes animate within a `spacing` threshold they don't overlap — they fuse into one continuous glass blob (metaball), then separate again when moving apart.
    - Motion spec: spring on the position; merge is a rendering blend, ~0.3–0.4s.
    - Liquid Glass traits: core merge/separate.
    - Web: **feasible** — SVG goo filter over spring-positioned shapes (same technique as DI split).

17. **glassEffectID shared-element morph**
    - Where: showing/hiding related glass elements (a button morphs into the panel it opens). API: `glassEffectID(_:in:)`.
    - Behavior: instead of appear/disappear, source glass shape stretches/re-flows directly into the destination shape.
    - Motion spec: shared-element (matched geometry) spring, ~0.4s, slight overshoot.
    - Web: **very feasible** — FLIP / Framer Motion `layoutId` shared-element morph.

---

## C. Tab bar

*Sources: Newsroom; https://developer.apple.com/videos/play/wwdc2025/323/ ; https://www.donnywals.com/exploring-tab-bars-on-ios-26-with-liquid-glass/ ; https://www.createwithswift.com/making-the-tab-bar-collapse-while-scrolling/*

18. **Shrink / minimize on scroll**
    - Where: `tabBarMinimizeBehavior(.onScrollDown)`.
    - Behavior: scrolling down collapses the floating glass tab bar toward a compact pill so content leads; labels fade, bar narrows.
    - Motion spec: ~0.25–0.3s ease; width/height + label opacity.
    - Web: **very feasible** — scroll-direction listener toggles a compact class with transitions.

19. **Expand on scroll up**
    - Behavior: scrolling up fluidly re-expands the tab bar to full width with labels.
    - Motion spec: mirror of #18, spring-y.
    - Web: **very feasible.**

20. **Search tab morph (circle → search field)**
    - Where: a `Tab(role: .search)`; iOS/iPadOS 26.
    - Behavior: tapping the separated search tab morphs the circular button into a full search field at the bottom, while the other tabs collapse down into a single button.
    - Motion spec: shared-element morph ~0.35s spring; simultaneous collapse of siblings.
    - Liquid Glass traits: search tab is visually separated glass; morph is glassEffectID-style.
    - Web: **very feasible** — `layoutId` morph circle→input + AnimatePresence collapse of the tab cluster.

21. **Floating glass tab bar refraction**
    - Behavior: the bar floats above content on Liquid Glass, refracting/tinting whatever scrolls beneath, with adaptive shadow (#14).
    - Web: **feasible (approximate)** — fixed pill with `backdrop-filter` + adaptive shadow.

---

## D. Sheets / modals

*Source: https://nilcoalescing.com/blog/PresentingLiquidGlassSheetsInSwiftUI/*

22. **Sheet morph from source button**
    - Where: sheet presented from a toolbar button.
    - Behavior: the sheet grows directly out of the button that presented it (shared-element), instead of sliding up from nowhere.
    - Motion spec: matched-geometry spring ~0.4s.
    - Web: **very feasible** — `layoutId` from button to sheet.

23. **Detent glass-opacity + corner-nesting transition**
    - Where: sheets with `.presentationDetents([.medium, .large])`.
    - Behavior: at partial height the sheet is translucent glass with edges curving inward to nest within the display's rounded corners; dragging to full height, the glass gradually turns opaque and anchors to the screen edges (corner radius flattens).
    - Motion spec: drag-linked; corner-radius + inset + background opacity interpolate with height.
    - Web: **feasible** — drag-linked CSS vars mapping height→(radius, inset, backdrop opacity).

24. **Rubber-band drag / spring dismiss**
    - Where: dragging a sheet past its detent, or flick-to-dismiss.
    - Behavior: resists past the top edge (rubber-band), snaps to nearest detent, or springs off-screen on a fast flick.
    - Motion spec: velocity-aware spring; rubber-band = asymptotic resistance.
    - Web: **feasible** — pointer drag with a spring lib (`react-spring`/Framer) + rubber-band easing on overscroll.

---

## E. Navigation

*Sources: https://developer.apple.com/documentation/swiftui/customizabletoolbarcontent/matchedtransitionsource(id:in:) ; https://www.createwithswift.com/using-the-zoom-navigation-transition/ (zoom API since iOS 18, carried into 26).*

25. **Zoom transition (tap element → full screen)**
    - Where: `.navigationTransition(.zoom(sourceID:in:))` + `.matchedTransitionSource`.
    - Behavior: tapped cell/thumbnail expands and flies into the full detail view, its frame morphing from source rect to full screen (and reverses on pop). If source is gone, it zooms from container center.
    - Motion spec: matched-geometry spring, ~0.4–0.5s, slight overshoot; frame + corner-radius + content cross-fade.
    - Web: **very feasible** — FLIP / `layoutId` shared-element from thumbnail to full view.

26. **Push / pop with glass toolbar**
    - Behavior: standard horizontal push/pop, but toolbar/back button are floating glass; titles fade under scroll-edge effect.
    - Motion spec: ~0.35s ease; x-translate + parallax of outgoing view.
    - Web: **very feasible** — route transition with translateX + parallax.

27. **Contextual menu bloom from source point**
    - Where: long-press context menus, `Menu` popovers.
    - Behavior: menu scales up from the touched control's anchor point (transform-origin at source), the source may lift/blur its surroundings; glass "bubble pops open."
    - Motion spec: spring scale from ~0.85 with overshoot ~0.3s; transform-origin at source.
    - Liquid Glass traits: "bubble pops open," thickening (#15).
    - Web: **very feasible** — `transform-origin` at anchor + scale/opacity spring; optional backdrop dim/blur.

---

## F. App icons

*Sources: https://www.macstories.net/stories/ios-and-ipados-26-the-macstories-review/4/ ; https://www.macrumors.com/2025/09/17/ios-26-liquid-glass-makes-app-icons-look-crooked/ ; https://gizmodo.com/this-liquid-glass-optical-illusion-on-ios-26-...*

28. **Clear / tinted / dark glass icon rendering**
    - Where: Home Screen appearance modes (Default, Dark, Clear, Tinted).
    - Behavior: icons render as multi-layer Liquid Glass — Clear removes color and makes them see-through with reflective glass; corners get subtle glow.
    - Motion spec: mostly static material; comes alive with #29.
    - Web: **feasible (approximate)** — layered translucent glass with `backdrop-filter`, edge glow.

29. **Tilt parallax + specular (gyroscope-driven)**
    - Where: Home Screen, especially Dark/Clear/Tinted on dark backgrounds.
    - Behavior: tilting the phone moves specular highlights and light-refraction across each icon in real time (gyroscope/accelerometer); depth parallax between glass layers.
    - Motion spec: continuous, orientation-driven; highlight position + layer offset.
    - Web: **feasible** — `deviceorientation` (or pointer on desktop) drives highlight gradient position + layered translateZ/parallax.

30. **Jiggle (edit) mode + glass delete badge**
    - Where: long-press empty Home Screen area.
    - Behavior: icons wiggle continuously; the remove (minus) badge is rendered in Liquid Glass.
    - Motion spec: small-angle rotation oscillation ~±3°, ~0.25s period, each icon phase-offset.
    - Web: **very feasible** — CSS keyframe rotate wiggle with per-icon `animation-delay`.

31. **Icon press / launch morph**
    - Where: tapping to open an app.
    - Behavior: icon depresses slightly (glass flex), then the app "zooms open" from the icon's frame to full screen; reverses on close (back to icon).
    - Motion spec: press scale ~0.95, then matched-geometry zoom ~0.4s.
    - Web: **very feasible** — press scale + `layoutId` zoom (same as #25).

---

## G. SF Symbols 7 animations

*Sources: https://developer.apple.com/videos/play/wwdc2025/337/ ; https://www.createwithswift.com/animating-sf-symbols-with-the-symbol-effect-modifier/ ; https://9to5mac.com/2025/06/11/apple-releases-sf-symbols-7-beta/ . Applied via `.symbolEffect(...)`.*

32. **Bounce** — one-shot elastic scale up then settle. Spec: spring, overshoot, ~0.5s; scale (optionally directional). Web: **very feasible** — keyframe scale spring.

33. **Wiggle** — symbol shakes back-and-forth along an axis (or rotational). Spec: damped oscillation, a few cycles ~0.6s. Web: **very feasible** — keyframe translate/rotate decay.

34. **Breathe** — smooth continuous scale + opacity in/out, like breathing. Spec: sine ease, ~2s loop, gentle. Web: **very feasible** — infinite ease-in-out scale+opacity.

35. **Rotate** — element (or sub-layer) spins; can be indefinite. Spec: linear or spring, continuous or one-shot. Web: **very feasible** — rotate keyframe.

36. **Pulse** — opacity of a layer fades up/down to signal ongoing activity. Spec: ~1s loop ease-in-out opacity. Web: **very feasible.**

37. **Variable Color** — segments illuminate in sequence (e.g., Wi-Fi/signal arcs filling). Spec: staggered opacity/color per layer, cumulative or iterative. Web: **feasible** — staggered opacity on grouped paths.

38. **Magic Replace (symbol → symbol morph)** — swapping one symbol for a related one, shared strokes morph and only the differing parts draw in/out. Spec: ~0.4s; path morph + draw. Web: **hard/approximate** — SVG path morphing (flubber) for matched strokes; simple cases only.

39. **Draw-on / Variable Draw** — symbol strokes draw as if handwritten (organic stroke order); Variable Draw fills proportionally to a value (progress/strength). Spec: stroke reveal ~0.6–1s per stroke, sequenced. Web: **feasible** — SVG `stroke-dasharray`/`stroke-dashoffset` draw; Variable Draw = dashoffset bound to a value.

---

## H. Controls & feedback

40. **Scroll edge effect (content dissolve under toolbar)**
    - Where: top/bottom of scroll views under floating glass bars. Source: WWDC25 219.
    - Behavior: content gently dissolves (blur + fade) into the background as it scrolls beneath the glass, so floating titles/controls stay legible; "hard" variant applies a uniform cutoff for pinned accessories.
    - Motion spec: continuous, scroll-linked; progressive blur/opacity gradient at the edge.
    - Web: **feasible (approximate)** — a gradient mask + `backdrop-filter` band at the edge; true progressive blur needs layered blur or mask-image tricks.

41. **Toggle / switch spring**
    - Behavior: thumb slides across with a spring settle; track color cross-fades; slight thumb overshoot.
    - Motion spec: spring ~0.3s, mild overshoot; x-position + background color.
    - Web: **very feasible** — spring translate + color transition.

42. **Slider physics**
    - Behavior: thumb tracks the finger 1:1, springs to detents/snaps on release; may rubber-band at ends; haptic ticks.
    - Web: **feasible** — pointer drag + spring snap; haptics unavailable on web.

43. **Springy checkmark / completion**
    - Behavior: on success, a checkmark draws-on + the container bounces; often paired with SF Symbol bounce.
    - Motion spec: path draw ~0.3s + scale bounce.
    - Web: **very feasible** — SVG stroke draw + scale spring.

44. **Pull-to-refresh**
    - Behavior: overscroll stretches a spinner/indicator (rubber-band), releases into a spin, then springs back as content reloads.
    - Motion spec: drag-linked stretch + spring return; rotation loop while loading.
    - Web: **feasible** — overscroll drag with rubber-band easing + spinner.

45. **Numeric text roll**
    - Where: counters, timers, prices (`.contentTransition(.numericText())`).
    - Behavior: changed digits roll vertically like an odometer; unchanged digits stay put.
    - Motion spec: ~0.25s ease per digit, direction = increase/decrease.
    - Web: **very feasible** — stacked-digit column translateY.

46. **Button lift into glass on press**
    - Where: controls that "lift up into Liquid Glass temporarily" during interaction (WWDC25 219).
    - Behavior: on touch, a flat control elevates into a glass state (gains translucency + highlight), returns to flat on release.
    - Motion spec: ~0.2s; shadow/scale/blur ramp.
    - Web: **feasible** — toggle a glass class on press with transitions.

---

## I. System surfaces

47. **Lock screen adaptive clock**
    - Where: Lock Screen over photo wallpapers. Source: Newsroom.
    - Behavior: the time fluidly reflows to sit *behind* the photo's subject (depth compositing); San Francisco numerals dynamically scale weight/width/height to fill the available space.
    - Motion spec: layout adapts on wallpaper/context change; weight interpolation.
    - Liquid Glass traits: depth/occlusion; variable-font weight morph.
    - Web: **feasible (approximate)** — variable-font `font-variation-settings` for weight/width; subject-occlusion needs a pre-masked PNG cutout layered above the clock.

48. **Control Center glass**
    - Behavior: modules render as Liquid Glass tiles; opening blurs/dims the backdrop; tiles animate in with a slight spring; sliders/toggles use #41–42.
    - Web: **feasible** — glass grid + backdrop blur + staggered entrance.

49. **Notification / banner glass slide**
    - Behavior: notifications slide down as floating glass, refracting the wallpaper; dismiss slides up/away with spring.
    - Motion spec: ~0.4s spring in; drag-to-dismiss.
    - Web: **very feasible** — translateY spring + glass background.

50. **Keyboard glass**
    - Behavior: keyboard adopts glass/translucent styling; keys flex slightly on press.
    - Web: **feasible** — translucent key surfaces + press scale (mostly static).

---

## J. macOS Tahoe 26 specifics

*Sources: Newsroom; https://www.techpowerup.com/337895/... ; https://eclecticlight.co/2025/09/15/appearance-matters-get-tahoe-looking-in-better-shape/*

51. **Floating dock refraction** — the Dock floats above the desktop; icons/folders are translucent glass refracting the wallpaper behind. Web: **feasible** — `backdrop-filter` dock, magnify-on-hover already classic.

52. **Sidebar wallpaper reflection + auto-resize** — sidebars subtly reflect the wallpaper (so you sense location) and auto-adjust width to fit content, with rounded corners. Motion: width morph ~0.3s. Web: **feasible (approximate)** — animated width + faint wallpaper reflection layer.

53. **Transparent menu bar** — the menu bar becomes fully transparent, making the display feel larger; content shows through. Web: **feasible** — transparent bar over content.

54. **Window / toolbar morph** — toolbars are softened, rounded glass that morph size to content; controls dynamically morph as more options appear (shared with #15/#27). Web: **feasible** — layout morph of the toolbar container.

---

## Build priority for the web showcase (opinionated)

- **Tier 1 (high-impact, very feasible):** Dynamic Island #1/#4/#5/#6, glassEffectID/shared-element morphs #17/#20/#22/#25/#31, SF Symbols #32–37/#39, gel press #10, numeric roll #45, jiggle #30.
- **Tier 2 (feasible, signature look):** frost/blur glass + adaptive shadow #14, materialize #13, scroll-edge #40, sheet detents #23, context-menu bloom #27, tilt specular #29.
- **Tier 3 (hard/approximate — do "good enough"):** true lensing/refraction #8, adaptive tint #12, Magic Replace path morph #38, metaball merge #2/#16 (SVG goo), subject-occluded clock #47.

**Total distinct effects catalogued: 54.**

### Most authoritative sources
1. https://developer.apple.com/videos/play/wwdc2025/219/ — "Meet Liquid Glass"
2. https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/
3. https://developer.apple.com/design/human-interface-guidelines/materials
4. https://developer.apple.com/videos/play/wwdc2025/337/ — "What's new in SF Symbols 7"
5. https://developer.apple.com/documentation/swiftui/glasseffectcontainer
