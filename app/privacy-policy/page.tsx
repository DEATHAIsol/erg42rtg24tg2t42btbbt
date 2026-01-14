'use client'

import { TerminalHeader } from '@/components/TerminalHeader'

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col h-screen bg-terminal-bg">
      <TerminalHeader />
      <main className="flex-1 overflow-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-3">Privacy Policy</h1>
          <p className="text-sm text-terminal-text-secondary mb-6">
            This Privacy Policy explains how Probio Markets collects, uses, and protects your data.
          </p>
          <div className="text-sm text-terminal-text-secondary">
            <p className="whitespace-pre-line">
              {`ProbioMarkets.com Privacy Policy Document

PRIVACY POLICY

Last Updated: January 3, 2026

Introduction

This Privacy Policy ("Policy") explains how ProbioMarkets B.V., a corporation organized under the laws of Curaçao (the "Company," "we," "us," or "our"), collects, uses, and protects your information when you use ProbioMarkets.com and related services (the "Site" and "Services").

By using our Services, you agree to this Policy. If you don't agree, please don't use our Site.

For questions, email us at: privacy@probiomarkets.com

What Information We Collect

Information You Provide
- Account Information: Name, email, date of birth, location
- Identity Verification: Government ID, address verification documents (when required)
- Wallet Information: Your self-hosted wallet address (public blockchain data)
- Communications: Messages, support requests, survey responses

Information We Collect Automatically
- Usage Data: IP address, browser type, device information, pages visited
- Geolocation: Approximate location based on IP address or GPS (for compliance)
- Cookies & Tracking: We use cookies to improve your experience and detect fraud

Financial Information
We don't store your payment details. Third-party wallet providers (like Phantom, Solflare) handle transactions according to their own privacy policies.

How We Use Your Information

We use your information to:
- Provide Services: Enable trading, resolve markets, process transactions
- Verify Identity: Comply with anti-money laundering (AML) and know-your-customer (KYC) requirements
- Prevent Fraud: Detect suspicious activity, enforce geographic restrictions
- Improve Platform: Analyze usage, fix bugs, develop new features
- Communicate: Send updates, security alerts, customer support responses
- Legal Compliance: Meet regulatory obligations, respond to lawful requests

How We Share Your Information

We may share your information with:

- Service Providers: Cloud hosting, analytics, fraud detection, customer support tools
- Legal Requirements: Law enforcement, regulators, courts when legally required
- Business Transfers: In case of merger, acquisition, or sale of assets
- Blockchain Networks: Your wallet address and transactions are public on Solana

We never sell your personal information to third parties.

Your Blockchain Activity is Public

Because we operate on Solana, your wallet address and all transactions are permanently recorded on a public blockchain. Anyone can view this information. We cannot delete or modify blockchain data.

Cookies & Tracking Technologies

We use cookies for:
- Essential Functions: Account login, security
- Analytics: Understanding how users interact with our Site
- Fraud Prevention: Detecting bots and malicious activity

You can disable cookies in your browser, but some features may not work properly.

We don't respond to Do Not Track (DNT) signals.

Data Security

We use industry-standard security measures including encryption, firewalls, and access controls. However, no method is 100% secure. You're responsible for protecting your wallet and private keys.

Your Privacy Rights

Depending on where you live, you may have the right to:

- Access: Request a copy of your personal information
- Correction: Update inaccurate information
- Deletion: Request deletion of your data (subject to legal obligations)
- Objection: Object to certain data processing
- Portability: Receive your data in a machine-readable format
- Withdraw Consent: Stop allowing us to process your information

To exercise these rights, email: privacy@probiomarkets.com

Note: We may need to verify your identity before fulfilling requests. Some data cannot be deleted due to legal or blockchain requirements.

International Data Transfers

Your information may be transferred to and stored in countries outside your residence, including Curaçao. We ensure adequate protections are in place for international transfers.

Children's Privacy

Our Services are not for anyone under 18. We don't knowingly collect information from children. If we discover we have, we'll delete it immediately.

Third-Party Links

Our Site may link to external websites or services. We're not responsible for their privacy practices. Review their policies before sharing information.

Data Retention

We keep your information as long as:
- Your account is active
- Needed to provide Services
- Required by law (typically 5-7 years for compliance records)

After that, we securely delete or anonymize your data.

Changes to This Policy

We may update this Policy from time to time. We'll post the new version with an updated date at the top. Continued use means you accept the changes.

Geographic Restrictions

We don't offer trading services to users in: United States, United Kingdom, France, Ontario, Singapore, Poland, Thailand, Australia, Belgium, Taiwan, or sanctioned territories.

Using a VPN to bypass restrictions is prohibited and may result in account termination.

Contact Us

Privacy Questions: privacy@probiomarkets.com  
General Support: support@probiomarkets.com  
Legal Counsel: HBN Law & Tax

ProbioMarkets B.V.  
Company Number: 8542182  
Registered in Curaçao

Your privacy matters to us. If you have concerns, please reach out. `}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

