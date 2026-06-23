/** Tailwind `xl` — persistent right-side AI panel is shown at this width and above. */
export const XL_MEDIA_QUERY = '(min-width: 1280px)'

/** Collapsed desktop AI strip width (px). Matches Tailwind `w-14`. */
export const AI_PANEL_STRIP_WIDTH_PX = 56

/** Expanded desktop AI panel width (px). */
export const AI_PANEL_EXPANDED_WIDTH_PX = 350

export function isXlUp(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(XL_MEDIA_QUERY).matches
}

