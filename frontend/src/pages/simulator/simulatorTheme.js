/**
 * simulatorTheme.js — Color class mappings for light and dark simulator themes
 *
 * Instead of scattering ternaries like `isDark ? 'bg-[#0A0A0A]' : 'bg-dictator-cream'`
 * across every component, this file defines named "slots" for each UI role.
 *
 * Components call `getThemeClasses(isDark)` and use the returned object:
 *   const t = getThemeClasses(isDark);
 *   <div className={t.pageBg}>
 *
 * This keeps all color decisions in one place so you can tweak the light theme
 * without hunting through 6 different JSX files.
 */

export function getThemeClasses(isDark) {
  return {
    // Page-level backgrounds
    pageBg: isDark ? 'bg-dictator-void text-white' : 'bg-dictator-cream text-dictator-ink',
    panelBg: isDark ? 'bg-[#0A0A0A]' : 'bg-dictator-linen',
    canvasBg: isDark ? '#0D0D0D' : '#E8E4DE',

    // Header
    headerBg: isDark ? 'bg-dictator-void/90 backdrop-blur-xl' : 'bg-dictator-cream/90 backdrop-blur-xl',
    headerBorder: isDark ? 'border-dictator-chrome/10' : 'border-dictator-sand',
    headerText: isDark ? 'text-white' : 'text-dictator-ink',

    // Borders
    border: isDark ? 'border-dictator-chrome/10' : 'border-dictator-sand',

    // Text
    textPrimary: isDark ? 'text-white' : 'text-dictator-ink',
    textSecondary: isDark ? 'text-white/60' : 'text-dictator-ink/50',
    textMuted: isDark ? 'text-white/30' : 'text-dictator-ink/30',
    textLabel: isDark ? 'text-white/90' : 'text-dictator-ink/80',
    textMono: isDark ? 'text-white' : 'text-dictator-ink',

    // Buttons
    btnDefault: isDark
      ? 'border-dictator-chrome/10 bg-[#111] text-white hover:border-dictator-red/40'
      : 'border-dictator-sand bg-white text-dictator-ink hover:border-dictator-red/40',
    btnDisabled: isDark
      ? 'bg-[#1A1A1A] border-dictator-chrome/10 text-white/30 cursor-not-allowed'
      : 'bg-dictator-sand/50 border-dictator-sand text-dictator-ink/30 cursor-not-allowed',
    btnActive: 'border-dictator-red bg-dictator-red/15 text-dictator-red',

    // Cards / containers
    cardBg: isDark ? 'bg-[#111]' : 'bg-white',
    kbdBg: isDark
      ? 'rounded border border-dictator-chrome/20 bg-[#1A1A1A] text-white'
      : 'rounded border border-dictator-sand bg-white text-dictator-ink',
    inputBg: isDark
      ? 'border-dictator-chrome/10 bg-[#1A1A1A] text-white'
      : 'border-dictator-sand bg-white text-dictator-ink',

    // Overlays (on canvas)
    overlay: isDark ? 'bg-black/50' : 'bg-white/70',

    // Face map
    faceMapBg: isDark ? 'bg-[#0A0A0A]' : 'bg-dictator-linen',
  };
}
