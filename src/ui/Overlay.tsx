import type { ComponentChildren } from 'preact';

/** Centered modal layer over the whole screen. */
export function Overlay({ children }: { children: ComponentChildren }) {
  return (
    <div class="overlay" role="dialog" aria-modal="true">
      <div class="overlay-card">{children}</div>
    </div>
  );
}
