import type { Appearance } from '@clerk/types'

/**
 * Clerk UI themed to the Probio design system so auth never looks bolted on:
 * warm near-black surfaces, the coral brand accent, and the same type stack.
 */
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: '#FF7D5A',
    colorBackground: '#12100F',
    colorText: '#F5F2EF',
    colorTextSecondary: '#A39C95',
    colorInputBackground: '#0A0908',
    colorInputText: '#F5F2EF',
    colorDanger: '#F6465D',
    colorSuccess: '#2FD48C',
    colorWarning: '#F0B90B',
    colorNeutral: '#F5F2EF',
    borderRadius: '10px',
    fontFamily: 'var(--font-sans), Inter, sans-serif',
    fontFamilyButtons: 'var(--font-sans), Inter, sans-serif',
  },
  elements: {
    // Coral is a light accent — its foreground must be ink, not white.
    formButtonPrimary:
      'bg-terminal-accent hover:bg-terminal-accent-hover text-terminal-ink font-semibold shadow-none normal-case',
    card: 'bg-terminal-surface border border-terminal-border shadow-modal',
    headerTitle: 'font-display tracking-tight',
    headerSubtitle: 'text-terminal-text-secondary',
    socialButtonsBlockButton:
      'bg-terminal-elevated border border-terminal-border text-terminal-text-primary hover:bg-terminal-border/40',
    formFieldInput:
      'bg-terminal-bg border border-terminal-border text-terminal-text-primary',
    footerActionLink: 'text-terminal-accent hover:text-terminal-accent-hover',
    dividerLine: 'bg-terminal-border',
    dividerText: 'text-terminal-text-muted',
    userButtonPopoverCard: 'bg-terminal-surface border border-terminal-border shadow-modal',
    userButtonPopoverActionButton: 'text-terminal-text-secondary hover:bg-terminal-elevated',
    userButtonPopoverFooter: 'hidden',
    badge: 'bg-terminal-accent/10 text-terminal-accent border border-terminal-accent/30',
  },
}
