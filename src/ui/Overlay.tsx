import type { ComponentChildren } from 'preact';

interface Props {
  children: ComponentChildren;
  /** When given, shows a button to hide the overlay temporarily (to look at the map / use debug tools). */
  onHide?: () => void;
}

/** Centered modal layer over the whole screen. */
export function Overlay({ children, onHide }: Props) {
  return (
    <div class="overlay" role="dialog" aria-modal="true">
      <div class="overlay-card">
        {onHide && (
          <button class="btn small ghost overlay-hide" onClick={onHide}>
            👁 Masquer
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
