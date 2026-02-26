import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createAssociatedTokenAccountInstruction, createMintToInstruction, getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import EnrichTokensWithAuthoritiesField from "../utils/EnrichTokensWithAuthorityFields";
import EnrichTokenWithMetadata from "../utils/EnrichTokenWithMetadata";

export default function SendTokensPage() {
    const [mintToAddress, setMintToAddress] = useState<string>("");
    const [mintAmount, setMintAmount] = useState<number>(0);
    const { connection } = useConnection();
    const wallet = useWallet();
    const [allTokens, setAllTokens] = useState<{
        mintAddress: PublicKey,
        amount: number,
        owner: string,
        mintAuthority: string | null,
        freezeAuthority: string | null,
        name: string | null,
        symbol: string | null,
        uri: string | null,
        decimals: number
    }[] | null>(null);
    const [selectedAirdropMint, setSelectedAirdropMint] = useState<{ mintAddress: PublicKey, decimals: number } | null>(null);
    const [createdMints, setCreatedMints] = useState<{ mintAddress: PublicKey; symbol: string; name: string; decimals: number }[]>([]);

    useEffect(() => {
        const storedMints = localStorage.getItem('createdMints');
        if (storedMints) {
            try {
                const parsed = JSON.parse(storedMints);
                setCreatedMints(parsed.map((m: any) => ({
                    ...m,
                    mintAddress: new PublicKey(m.mintAddress),
                })));
            } catch (e) {
                console.error('Failed to parse stored mints', e);
            }
        }
    }, []);

    const getAllTokens = useCallback(async () => {
        if (!wallet.publicKey) return;
        try {
            const spl_tokens = await connection.getParsedTokenAccountsByOwner(
                wallet.publicKey,
                { programId: TOKEN_PROGRAM_ID }
            );
            const tokens_program2022 = await connection.getParsedTokenAccountsByOwner(
                wallet.publicKey,
                { programId: TOKEN_2022_PROGRAM_ID }
            );

            const allTokens = [...spl_tokens.value, ...tokens_program2022.value];
            const mintDetails = allTokens.map((token) => {
                const parsedInfo = token.account.data.parsed.info;
                return {
                    mintAddress: new PublicKey(parsedInfo.mint),
                    amount: parsedInfo.tokenAmount.uiAmount,
                    owner: parsedInfo.owner,
                    mintAuthority: parsedInfo.mintAuthority || null,
                    freezeAuthority: parsedInfo.freezeAuthority || null,
                    name: null,
                    symbol: null,
                    uri: null,
                    decimals: parsedInfo.tokenAmount.decimals
                };
            }).filter((token) => token.amount > 0);
            const tokensWithAuthorityFields = await EnrichTokensWithAuthoritiesField(mintDetails, connection);
            const tokensWithMetadata = await EnrichTokenWithMetadata(tokensWithAuthorityFields, connection);
            setAllTokens(tokensWithMetadata);
        } catch (e) {
            console.error('Failed to fetch tokens', e);
        }
    }, [wallet.publicKey, connection]);

    useEffect(() => {
        getAllTokens();
    }, [getAllTokens]);

    const airdropMintOptions = useMemo(() => {
        const walletBase58 = wallet.publicKey?.toBase58();
        const fromWallet = (allTokens ?? [])
            .filter(t => t.mintAuthority === walletBase58)
            .map(t => ({ mintAddress: t.mintAddress, label: t.symbol ? `${t.symbol} (${t.name})` : t.mintAddress.toBase58(), decimals: t.decimals }));
        const allTokenMints = new Set((allTokens ?? []).map(t => t.mintAddress.toBase58()));
        const fromCreated = createdMints
            .filter(m => !allTokenMints.has(m.mintAddress.toBase58()))
            .map(m => ({ mintAddress: m.mintAddress, label: m.symbol ? `${m.symbol} (${m.name})` : m.mintAddress.toBase58(), decimals: m.decimals }));
        return [...fromWallet, ...fromCreated];
    }, [allTokens, createdMints, wallet.publicKey]);

    const AirdropToAddress = async (tokenMint: { mintAddress: PublicKey, decimals: number }) => {
        try {
            if (!wallet.publicKey) {
                alert("Connect wallet first");
                return;
            }
            if (!tokenMint.mintAddress) {
                alert("Invalid mint address")
                return;
            }

            const mintAccountInfo = await connection.getAccountInfo(tokenMint.mintAddress);
            const programId = mintAccountInfo?.owner.equals(TOKEN_2022_PROGRAM_ID)
                ? TOKEN_2022_PROGRAM_ID
                : TOKEN_PROGRAM_ID;

            const accountAddress = getAssociatedTokenAddressSync(
                tokenMint.mintAddress,
                new PublicKey(mintToAddress),
                false,
                programId
            );

            const isAtaExists = await connection.getAccountInfo(accountAddress);

            if (!isAtaExists) {
                const transaction = new Transaction()
                    .add(createAssociatedTokenAccountInstruction(
                        wallet.publicKey,
                        accountAddress,
                        new PublicKey(mintToAddress),
                        tokenMint.mintAddress,
                        programId
                    ))
                const signature = await wallet.sendTransaction(transaction, connection);
                await connection.confirmTransaction(signature, "confirmed");
            }

            const mintTokenInstruction = createMintToInstruction(
                tokenMint.mintAddress,
                accountAddress,
                wallet.publicKey,
                mintAmount * (10 ** tokenMint.decimals),
                [],
                programId
            );
            const transaction2 = new Transaction().add(mintTokenInstruction);
            const signature = await wallet.sendTransaction(transaction2, connection);
            await connection.confirmTransaction(signature, "confirmed");

            if (new PublicKey(mintToAddress).equals(wallet.publicKey)) {
                setTimeout(() => {
                    getAllTokens();
                }, 1200);
            }

            alert(`${mintAmount} airdrop successful to address ${mintToAddress}`)
        } catch (e) {
            console.log("error:", e)
        }
    }

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl text-black bg-white border border-white">
                <div className="w-full text-center px-6 pb-2">
                    <div>
                        <h2 className="mt-4 cal-sans text-5xl">
                            Send Tokens
                        </h2>
                        <p className="mt-1 text-lg text-gray-400">
                            Mint tokens to any wallet address.
                        </p>
                    </div>
                </div>

                <div className="px-6 py-5 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium">
                            Token Mint
                        </label>
                        <select
                            value={selectedAirdropMint?.mintAddress.toBase58() ?? ""}
                            onChange={(e) => {
                                setSelectedAirdropMint({
                                    mintAddress: new PublicKey(e.target.value),
                                    decimals: (allTokens?.find((token) => token.mintAddress.equals(new PublicKey(e.target.value)))?.decimals || 
                                    createdMints.find((mint) => mint.mintAddress.equals(new PublicKey(e.target.value)))?.decimals) as number
                                })
                            }}
                            className="w-full rounded-2xl border border-gray-300 px-3 py-2.5 text-sm placeholder:text-slate-500 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 transition"
                        >
                            <option value="">Select a token mint…</option>
                            {airdropMintOptions.map(opt => (
                                <option key={opt.mintAddress.toBase58()} value={opt.mintAddress.toBase58()}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium">
                            Amount
                        </label>
                        <input
                            type="number"
                            min={0}
                            placeholder="Enter the airdrop amount"
                            className="w-full rounded-2xl border border-gray-300 px-3 py-2.5 text-sm placeholder:text-slate-500 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 transition [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            onChange={(e) => setMintAmount(Number(e.target.value))}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium">
                            Receiver Address
                        </label>
                        <input
                            type="text"
                            placeholder="Enter the receiver's address"
                            className="w-full rounded-2xl border border-gray-300 px-3 py-2.5 text-sm placeholder:text-slate-500 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 transition"
                            onChange={(e) => setMintToAddress(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => {
                            if (!selectedAirdropMint) {
                                alert("Select a token mint to airdrop");
                                return;
                            }
                            AirdropToAddress(selectedAirdropMint);
                        }}
                        className="mt-2 inline-flex items-center justify-center rounded-xl border cursor-pointer bg-black text-lg text-white px-4 py-2.5 hover:bg-emerald-500 hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 focus:ring-offset-slate-950 transition"
                    >
                        Send Tokens
                    </button>
                </div>

                <div className="px-6 pb-5 text-[11px] text-slate-500 border-t border-slate-800/80">
                    <p>
                        Ensure your wallet is connected and you have mint authority
                        for the selected token before sending.
                    </p>
                </div>
            </div>
        </div>
    )
}
