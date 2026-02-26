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
            const signature = await wallet.sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, "confirmed");
            alert("Sent " + amount + " SOL to " + to);
        }
        catch (e) {
            console.log("Error : ", e);
        }
    }

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl text-black bg-white border border-white">
                <div className="w-full text-center px-6 pb-2">
                    <div>
                        <h2 className="mt-4 cal-sans text-5xl">
                            Send SOL
                        </h2>
                        <p className="mt-1 text-lg text-gray-400">
                            Transfer Solana to any wallet address.
                        </p>
                    </div>
                </div>

                <div className="px-6 py-5 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="receiver-address" className="text-xs font-medium">
                            Receiver Address
                        </label>
                        <input
                            type="text"
                            name="receiver-address"
                            id="receiver-address"
                            placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
                            className="w-full rounded-2xl border border-gray-300 px-3 py-2.5 text-sm placeholder:text-slate-500 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 transition font-mono"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="amount" className="text-xs font-medium">
                            Amount (SOL)
                        </label>
                        <input
                            type="number"
                            name="amount"
                            id="amount"
                            placeholder="e.g. 0.5"
                            min={0}
                            step="any"
                            className="w-full rounded-2xl border border-gray-300 px-3 py-2.5 text-sm placeholder:text-slate-500 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 transition [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={amount || ''}
                            onChange={(e) => setAmount(Number(e.target.value))}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={sendSolana}
                        className="mt-2 inline-flex items-center justify-center rounded-xl border cursor-pointer bg-black text-lg text-white px-4 py-2.5 shadow-lg shadow-emerald-500/30 hover:bg-emerald-500 hover:border-emerald-500 transition"
                    >
                        Send SOL
                    </button>
                </div>

                <div className="px-6 pb-5 text-[11px] text-slate-500 border-t border-slate-800/80">
                    <p>
                        Ensure your wallet is connected and has enough SOL for the transfer and transaction fees.
                    </p>
                </div>
            </div>
        </div>
    )
}
