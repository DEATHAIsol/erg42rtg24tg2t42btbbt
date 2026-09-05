import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Create account' }

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-terminal-bg flex flex-col">
      <div className="absolute inset-0 bg-grid pointer-events-none" aria-hidden="true" />

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-14">
        <Link href="/" className="flex items-center gap-2.5 mb-8">
          <img src="/icon.png" alt="" className="h-8 w-8 object-contain" />
          <span className="font-display text-lg font-bold tracking-tight">Probio</span>
        </Link>

        <SignUp />

        <div className="mt-8 text-center max-w-sm">
          <p className="text-sm text-terminal-text-secondary mb-3">
            Creating an account saves your paper portfolio and settings across devices.
            Your wallet key always stays on your device.
          </p>
          <Link
            href="/markets"
            className="inline-flex items-center gap-1.5 text-sm text-terminal-accent hover:text-terminal-accent-hover"
          >
            <ArrowLeft size={14} />
            Skip and try the demo first
          </Link>
        </div>
      </div>
    </div>
  )
}
