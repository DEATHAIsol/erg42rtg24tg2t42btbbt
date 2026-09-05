'use client'

import { useEffect, useState } from 'react'
import { clearAllParlays } from '@/lib/parlay-management'
import { addFunds } from '@/lib/paper-trading'

export default function ClearAndFundPage() {
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending')
  const [message, setMessage] = useState('')

  useEffect(() => {
    try {
      // Clear all parlays
      clearAllParlays()
      
      // Add 1000 ETH to paper trading balance
      const newBalance = addFunds(50)
      
      setStatus('success')
      setMessage(`✅ Successfully cleared all parlays and added 1000 ETH. New balance: ${newBalance} ETH`)
      
      // Redirect to home page after 2 seconds
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)
    } catch (error: any) {
      setStatus('error')
      setMessage(`❌ Error: ${error.message}`)
    }
  }, [])

  return (
    <div className="flex h-screen items-center justify-center bg-terminal-bg">
      <div className="text-center">
        {status === 'pending' && (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terminal-accent mx-auto mb-4"></div>
            <p className="text-terminal-text-primary">Clearing parlays and adding funds...</p>
          </div>
        )}
        {status === 'success' && (
          <div>
            <div className="text-4xl mb-4">✅</div>
            <p className="text-terminal-success text-lg mb-2">{message}</p>
            <p className="text-terminal-text-secondary text-sm">Redirecting to home page...</p>
          </div>
        )}
        {status === 'error' && (
          <div>
            <div className="text-4xl mb-4">❌</div>
            <p className="text-terminal-danger text-lg">{message}</p>
          </div>
        )}
      </div>
    </div>
  )
}




