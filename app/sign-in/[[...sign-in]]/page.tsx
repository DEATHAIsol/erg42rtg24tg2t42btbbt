import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Sign in' }

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-terminal-bg flex flex-col">
      <div className="absolute inset-0 bg-grid pointer-events-none" aria-hidden="true" />

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-14">
        <Link
          href="/"
          className="flex items-center gap-2.5 mb-8 group"
        >
          <img src="/icon.png" alt="" className="h-8 w-8 object-contain" />
          <span className="font-display text-lg font-bold tracking-tight">Probio</span>
        </Link>

        <SignIn />

        <div className="mt-8 text-center">
          <p className="text-sm text-terminal-text-secondary mb-3">
            An account is optional — the terminal and demo trading work without one.
          </p>
          <Link
            href="/markets"
            className="inline-flex items-center gap-1.5 text-sm text-terminal-accent hover:text-terminal-accent-hover"
          >
            <ArrowLeft size={14} />
            Continue as guest
          </Link>
        </div>
      </div>
    </div>
  )
}
