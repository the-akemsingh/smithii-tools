import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { useEffect, useState } from 'react'

function AirDrop() {
    const { connection } = useConnection()
    const wallet = useWallet()
    const [balance, setBalance] = useState<number | null>(null)

    const getBalance = async () => {
        if (!wallet.publicKey) {
            alert("Connect your wallet first")
            return
        }

        const bal = await connection.getBalance(wallet.publicKey)
        setBalance(bal / LAMPORTS_PER_SOL)
    }

    useEffect(() => {
        if (wallet.publicKey) {
            getBalance();
        }
    }, [wallet.publicKey])

    const AirDrop = async () => {
        if (!wallet.publicKey) {
            alert("Connect your wallet first");
            return;
        }

        try {
            const amountInput = document.getElementById("amount") as HTMLInputElement;
            const amount = parseFloat(amountInput?.value || "0");

            if (amount <= 0) {
                alert("Please enter an positive integer");
                return;
            }

            await connection.requestAirdrop(
                wallet.publicKey,
                amount * LAMPORTS_PER_SOL
            );

            alert(`Successfully airdropped ${amount} SOL~ to ${wallet.publicKey.toBase58()}`);
        } catch (error) {
            console.log("Airdrop failed:", error);
            alert(`Airdrop failed`);
        }
    }

    return (
        <div className="flex min-h-full flex-col items-center justify-center px-4 py-10">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-slate-900/40 backdrop-blur">
                <div className="px-6 pt-6 pb-2 border-b border-slate-800">
                    <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-amber-400/80 bg-amber-400/10 px-3 py-1 rounded-full">
                        Devnet
                    </p>
                    <h2 className="mt-4 text-xl font-semibold text-slate-50">
                        Solana Airdrop
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                        Request SOL to your connected wallet (max 5 SOL per request).
                    </p>
                </div>

                <div className="px-6 py-5 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="amount" className="text-xs font-medium text-slate-300">
                            Amount (SOL)
                        </label>
                        <input
                            type="number"
                            name="Solana airdrop amount"
                            placeholder="e.g. 1"
                            id="amount"
                            min={0.1}
                            max={5}
                            step={0.1}
                            defaultValue="1"
                            className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/40 transition [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <p className="text-[11px] text-slate-500">Enter a value between 0.1 and 5 SOL.</p>
                    </div>

                    <button
                        onClick={AirDrop}
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl border border-amber-500/70 bg-amber-500 text-sm font-semibold text-slate-950 px-4 py-2.5 shadow-lg shadow-amber-500/30 hover:bg-amber-400 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:ring-offset-2 focus:ring-offset-slate-950 transition cursor-pointer"
                    >
                        Airdrop
                    </button>

                    <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 px-4 py-3">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Balance</p>
                        <p className="mt-1 text-lg font-semibold text-emerald-400">
                            {balance != null ? balance : '—'} SOL
                        </p>
                    </div>
                </div>

                <div className="px-6 pb-5 text-[11px] text-slate-500 border-t border-slate-800/80">
                    <p>Airdrops are only available on Devnet. Ensure your wallet is connected.</p>
                </div>
            </div>
        </div>
    )
}

export default AirDrop;
