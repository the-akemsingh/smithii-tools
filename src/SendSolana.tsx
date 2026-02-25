import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useState } from "react";

export default function SendSolana() {
    const wallet = useWallet();
    const { connection } = useConnection();
    const [amount, setAmount] = useState<number>(0);
    const [to, setTo] = useState<string>("");


    const sendSolana = async () => {
        try {

            if (!wallet.publicKey) {
                alert("Connect your wallet first");
                return;
            }
            const transaction = new Transaction();
            transaction.add(
                SystemProgram.transfer(
                    {
                        fromPubkey: wallet.publicKey,
                        toPubkey: new PublicKey(to),
                        lamports: amount * LAMPORTS_PER_SOL
                    }
                ))
            await wallet.sendTransaction(transaction, connection);
            alert("Sent " + amount + " SOL to " + to);
        }
        catch (e) {
            console.log("Error : ", e);
        }
    }

    return (
        <div className="flex min-h-full flex-col items-center justify-center px-4 py-10">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-slate-900/40 backdrop-blur">
                <div className="px-6 pt-6 pb-2 border-b border-slate-800">
                    <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-emerald-400/80 bg-emerald-400/10 px-3 py-1 rounded-full">
                        Transfer
                    </p>
                    <h2 className="mt-4 text-xl font-semibold text-slate-50">
                        Send SOL
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                        Enter the recipient address and amount to send.
                    </p>
                </div>

                <div className="px-6 py-5 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="receiver-address" className="text-xs font-medium text-slate-300">
                            Receiver address
                        </label>
                        <input
                            type="text"
                            name="receiver-address"
                            id="receiver-address"
                            placeholder="e.g. 7xKX... or full base58"
                            className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 transition font-mono"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="amount" className="text-xs font-medium text-slate-300">
                            Amount (SOL)
                        </label>
                        <input
                            type="number"
                            name="amount"
                            id="amount"
                            placeholder="e.g. 0.5"
                            min={0}
                            step="any"
                            className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 transition [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={amount || ''}
                            onChange={(e) => setAmount(Number(e.target.value))}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={sendSolana}
                        className="inline-flex items-center justify-center rounded-xl border border-emerald-500/70 bg-emerald-500 text-sm font-semibold text-slate-950 px-4 py-2.5 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 focus:ring-offset-slate-950 transition cursor-pointer"
                    >
                        Send
                    </button>
                </div>

                <div className="px-6 pb-5 text-[11px] text-slate-500 border-t border-slate-800/80">
                    <p>Ensure your wallet is connected and has enough SOL for the transfer and fees.</p>
                </div>
            </div>
        </div>
    )
}
