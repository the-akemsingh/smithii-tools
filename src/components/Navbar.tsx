import { useWallet } from '@solana/wallet-adapter-react'
import { WalletDisconnectButton, WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { NavLink } from 'react-router-dom'

const navOptions = [
  { to: '/', label: 'Send SOL', end: true },
  { to: '/airdrop', label: 'Airdrop', end: false },
  { to: '/launch-token', label: 'Launch Token', end: false },
]

export default function Navbar() {
  const wallet = useWallet()

  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-slate-800/70 bg-slate-900/40 backdrop-blur">
      <div className="flex flex-col gap-6 p-4">
        <div className="flex items-center gap-3 px-2">
          <div className="h-9 w-9 rounded-xl bg-linear-to-br from-emerald-400/90 to-cyan-400/90 shadow-lg shadow-emerald-500/20" />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-50">Wallet Adapter</p>
            <p className="text-xs text-slate-400">Solana dApp UI</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navOptions.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t border-slate-800/70 pt-4">
          <WalletMultiButton className="h-10! rounded-xl! bg-emerald-500! px-4! text-sm! font-semibold! text-slate-950! hover:bg-emerald-400! focus:outline-none! focus:ring-2! focus:ring-emerald-500/40!" />
          {wallet.connected && (
            <WalletDisconnectButton className="h-10! rounded-xl! bg-slate-800! px-4! text-sm! font-semibold! text-slate-100! hover:bg-slate-700! focus:outline-none! focus:ring-2! focus:ring-slate-400/30!" />
          )}
        </div>
      </div>
    </aside>
  )
}
