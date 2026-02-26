import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { useState } from "react";
import { createInitializeMetadataPointerInstruction, createInitializeMintInstruction, ExtensionType, getMintLen, LENGTH_SIZE, TOKEN_2022_PROGRAM_ID, TYPE_SIZE } from "@solana/spl-token"
import { createInitializeInstruction, pack } from "@solana/spl-token-metadata";

export default function LaunchTokenPage() {
    const [tokenName, setTokenName] = useState<string>("");
    const [tokenSymbol, setTokenSymbol] = useState<string>("");
    const [tokenDecimals, setTokenDecimals] = useState<number>(0);
    const [mintKeyPair, setMintKeyPair] = useState<Keypair | null>();
    const { connection } = useConnection();
    const wallet = useWallet();

    async function createToken() {
        try {
            if (!wallet.publicKey) {
                alert("connect wallet first");
                return;
            }
            const mintKeypair = Keypair.generate();
            const metadata = {
                mint: mintKeypair.publicKey,
                name: tokenName,
                symbol: tokenSymbol,
                uri: 'https://copper-payable-buzzard-589.mypinata.cloud/ipfs/bafkreiflwzauw4n4axr6c3u2lmnquqfst6efajh6duewjy24gsb6llk5cu',
                additionalMetadata: [],
            };

            const mintLen = getMintLen([ExtensionType.MetadataPointer]);
            const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
            const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

            const transaction = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: wallet.publicKey,
                    lamports,
                    space: mintLen,
                    newAccountPubkey: mintKeypair.publicKey,
                    programId: TOKEN_2022_PROGRAM_ID,
                }),
                createInitializeMetadataPointerInstruction(mintKeypair.publicKey, wallet.publicKey, mintKeypair.publicKey, TOKEN_2022_PROGRAM_ID),
                createInitializeMintInstruction(mintKeypair.publicKey, tokenDecimals, wallet.publicKey, null, TOKEN_2022_PROGRAM_ID),
                createInitializeInstruction({
                    programId: TOKEN_2022_PROGRAM_ID,
                    mint: mintKeypair.publicKey,
                    metadata: mintKeypair.publicKey,
                    name: metadata.name,
                    symbol: metadata.symbol,
                    uri: metadata.uri,
                    mintAuthority: wallet.publicKey,
                    updateAuthority: wallet.publicKey,
                }),
            );

            transaction.feePayer = wallet.publicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            transaction.partialSign(mintKeypair);

            const signature = await wallet.sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, "confirmed")
            setMintKeyPair(mintKeypair);
            const prevCreatedMints = JSON.parse(localStorage.getItem("createdMints") ?? "[]");
            localStorage.setItem("createdMints", JSON.stringify([...prevCreatedMints, { mintAddress: mintKeypair.publicKey, symbol: metadata.symbol, name: metadata.name, decimals: tokenDecimals }]))
            alert("Mint Created");
        } catch (e) {
            console.log(e)
        }
    }

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl text-black bg-white border border-white">
                <div className="w-full text-center px-6 pb-2">
                    <div>
                        <h2 className="mt-4 cal-sans text-5xl">
                            Token Launchpad
                        </h2>
                        <p className="mt-1 text-lg text-gray-400">
                            Define your token details and deploy it on Solana.
                        </p>
                    </div>
                </div>

                <div className="px-6 py-5 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium ">
                            Token Name
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Solana Launch Token"
                            className="w-full rounded-2xl border border-gray-300 px-3 py-2.5 text-sm  placeholder:text-slate-500 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 transition"
                            onChange={(e) => setTokenName(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium">
                            Token Symbol
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. SLT"
                            className="w-full rounded-2xl border border-gray-300 px-3 py-2.5 text-sm placeholder:text-slate-500 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 transition"
                            onChange={(e) => setTokenSymbol(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium">
                                Decimals
                            </label>
                            <input
                                type="number"
                                min={0}
                                placeholder="e.g. 9"
                                className="w-full rounded-2xl  border border-gray-300 px-3 py-2.5 text-sm placeholder:text-slate-500 outline-none transition [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                onChange={(e) => setTokenDecimals(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <button
                        onClick={createToken}
                        className="mt-2 inline-flex items-center justify-center rounded-xl border cursor-pointer bg-black  text-lg text-white px-4 py-2.5 shadow-lg shadow-emerald-500/30 hover:bg-emerald-500 hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 focus:ring-offset-slate-950 transition"
                    >
                        Launch Token
                    </button>
                </div>

                <div className="px-6 pb-5 text-[11px] text-slate-500 border-t border-slate-800/80">
                    <p>
                        Ensure your wallet is connected and funded with enough SOL for
                        rent and transaction fees before launching.
                    </p>
                </div>
            </div>
            {mintKeyPair && (
                <div className="w-full max-w-md mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-slate-900/40 backdrop-blur px-4 py-3">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Mint address</p>
                    <p className="text-slate-200 text-sm font-mono break-all">{mintKeyPair.publicKey.toBase58()}</p>
                </div>
            )}
        </div>
    )
}
