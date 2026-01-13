'use client'

import { Keypair, PublicKey } from '@solana/web3.js'
// @ts-ignore - bs58 types may not be perfect
import bs58 from 'bs58'

export interface CustodialWallet {
  publicKey: string
  secretKey: string // Base58 encoded
  createdAt: string
}

const WALLET_STORAGE_KEY = 'custodial-wallet'

/**
 * Get or create a custodial wallet for the user
 * If wallet exists in localStorage, returns it
 * Otherwise, generates a new wallet and stores it
 */
export function getOrCreateWallet(): CustodialWallet {
  if (typeof window === 'undefined') {
    throw new Error('Wallet functions can only be called in browser')
  }

  // Check if wallet already exists
  const stored = localStorage.getItem(WALLET_STORAGE_KEY)
  if (stored) {
    try {
      const wallet = JSON.parse(stored) as CustodialWallet
      // Validate wallet structure
      if (wallet.publicKey && wallet.secretKey) {
        return wallet
      }
    } catch (error) {
      console.warn('Failed to parse stored wallet, generating new one:', error)
    }
  }

  // Generate new wallet
  const keypair = Keypair.generate()
  
  const wallet: CustodialWallet = {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: bs58.encode(keypair.secretKey),
    createdAt: new Date().toISOString(),
  }

  // Store wallet
  localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(wallet))
  
  return wallet
}

/**
 * Get the current wallet (if exists)
 */
export function getWallet(): CustodialWallet | null {
  if (typeof window === 'undefined') {
    return null
  }

  const stored = localStorage.getItem(WALLET_STORAGE_KEY)
  if (!stored) {
    return null
  }

  try {
    const wallet = JSON.parse(stored) as CustodialWallet
    if (wallet.publicKey && wallet.secretKey) {
      return wallet
    }
  } catch (error) {
    console.error('Failed to parse stored wallet:', error)
  }

  return null
}

/**
 * Get the Keypair from stored wallet
 */
export function getKeypair(): Keypair | null {
  const wallet = getWallet()
  if (!wallet) {
    return null
  }

  try {
    const secretKey = bs58.decode(wallet.secretKey)
    return Keypair.fromSecretKey(secretKey)
  } catch (error) {
    console.error('Failed to decode wallet secret key:', error)
    return null
  }
}

/**
 * Get public key as PublicKey object
 */
export function getPublicKey() {
  const keypair = getKeypair()
  return keypair?.publicKey || null
}

/**
 * Check if user has a wallet
 */
export function hasWallet(): boolean {
  return getWallet() !== null
}

/**
 * Clear/delete the wallet (for testing or reset)
 */
export function clearWallet(): void {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem(WALLET_STORAGE_KEY)
}

