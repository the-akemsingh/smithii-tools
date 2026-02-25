
//If you know the exact public key → use direct read
// If you are searching → you are using an indexer
// Direct reads read the blockchain.
// Indexed queries read a database built from the blockchain.
//on-chain state vs indexed state

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, type ParsedAccountData } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { AuthorityType, createAssociatedTokenAccountInstruction, createInitializeMetadataPointerInstruction, createInitializeMint2Instruction, createInitializeMintInstruction, createMintToInstruction, createSetAuthorityInstruction, ExtensionType, getAssociatedTokenAddressSync, getMetadataPointerState, getMinimumBalanceForRentExemptMint, getMintLen, getTokenMetadata, LENGTH_SIZE, MINT_SIZE, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, TYPE_SIZE, unpackMint } from "@solana/spl-token"
import { createInitializeInstruction, pack, unpack, type TokenMetadata } from "@solana/spl-token-metadata";

export default function LaunchToken() {
    const [tokenName, setTokenName] = useState<string>("");
    const [tokenSymbol, setTokenSymbol] = useState<string>("");
    const [tokenDecimals, setTokenDecimals] = useState<number>(0);
    const [mintKeyPair, setMintKeyPair] = useState<Keypair | null>();
    const [mintToAddress, setMintToAddress] = useState<string>("");
    const [mintAmount, setMintAmount] = useState<number>(0);
    const [solBalance, setSolBalance] = useState<number | null>(0);
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
        uri: string | null
    }[] | null>(null);
    const [selectedTokens, setSelectedTokens] = useState<Set<PublicKey>>(new Set());
    const [expandedLaunch, setExpandedLaunch] = useState(true);
    const [expandedAirdrop, setExpandedAirdrop] = useState(true);
    const [expandedTokens, setExpandedTokens] = useState(true);


    const getBalance = async () => {
        const balance = await connection.getBalance(wallet.publicKey as PublicKey);
        setSolBalance(balance / LAMPORTS_PER_SOL);
    }


    //TODO : fetch tokens for both core-spl and token-2022 program, then for token-2022 program mints fetch their  metadata
    const getAllTokens = async () => {
        const spl_tokens = await connection.getParsedTokenAccountsByOwner(
            wallet.publicKey as PublicKey,
            { programId: TOKEN_PROGRAM_ID }
        )

        const tokens_program2022 = await connection.getParsedTokenAccountsByOwner(
            wallet.publicKey as PublicKey,
            { programId: TOKEN_2022_PROGRAM_ID }
        )

        const allTokens = [...spl_tokens.value, ...tokens_program2022.value]
        const mintDetails = allTokens.map((token) => {
            const parsedInfo = token.account.data.parsed.info;
            return {
                mintAddress: new PublicKey(parsedInfo.mint),
                amount: parsedInfo.tokenAmount.uiAmount,
                owner: parsedInfo.owner,
                mintAuthority: null,
                freezeAuthority: null,
                name: null,
                symbol: null,
                uri: null
            }
        }).filter((token) => token.amount > 0);

        if (mintDetails.length !== 0) {
            const tokensEnrichedWithMetaData = await enrichMetaData(mintDetails);
            let enriched = await enrichMintAuthorities(tokensEnrichedWithMetaData);
            setAllTokens(enriched);
        }

    }

    const enrichMetaData = async (
        allTokens:
            {
                mintAddress: PublicKey,
                amount: number,
                owner: string,
                mintAuthority: string | null,
                freezeAuthority: string | null,
                name: string | null,
                symbol: string | null,
                uri: string | null,
            }[]): Promise<{
                mintAddress: PublicKey;
                amount: number;
                owner: string;
                mintAuthority: string | null;
                freezeAuthority: string | null;
                name: string | null;
                symbol: string | null;
                uri: string | null;
            }[]> => {
        const enrichedTokensWithMetaData = await Promise.all(allTokens.map(async (token) => {
            try {
                const tokenMintAccount = await connection.getAccountInfo(token.mintAddress);
                const unPackedMint = unpackMint(token.mintAddress, tokenMintAccount, TOKEN_2022_PROGRAM_ID);
                const metaDataPointerState = getMetadataPointerState(unPackedMint);
                if (metaDataPointerState && metaDataPointerState.metadataAddress) {
                    const metaDataAccountAddress = metaDataPointerState.metadataAddress;
                    let metaData: TokenMetadata | null;
                    if (new PublicKey(token.mintAddress).equals(metaDataAccountAddress)) { //it means token is created using metadata pointer, and in that  name,symbol,uri are  saved in same account (token mint)
                        metaData = await getTokenMetadata(connection, token.mintAddress);
                        if (metaData) {
                            let imageUrl;
                            try {
                                const res = await fetch(metaData.uri);
                                const json = await res.json();
                                console.log("*********************", json)
                                imageUrl = json.image;
                            } catch (e) {
                                console.log("failed to load offchain metadata", e);
                            }
                            return {
                                ...token,
                                name: metaData.name,
                                symbol: metaData.symbol,
                                uri: imageUrl
                            };
                        }
                        return token;
                    }
                    //this logic still needs to be implemented
                    const metaDataAccountInfo = await connection.getAccountInfo(metaDataAccountAddress);
                    metaData = unpack(metaDataAccountInfo?.data);
                    return token;
                }
                return token;
            } catch (e) {
                console.log("Error", e);
                return token;
            }
        }));
        return enrichedTokensWithMetaData;
    }
    useEffect(() => {
        getBalance();
        getAllTokens();
    }, [wallet.publicKey])

    const enrichMintAuthorities = async (
        allTokens:
            {
                mintAddress: PublicKey,
                amount: number,
                owner: string,
                mintAuthority: string | null,
                freezeAuthority: string | null,
                name: string | null,
                symbol: string | null,
                uri: string | null,

            }[]
    )
        : Promise<{
            mintAddress: PublicKey;
            amount: number;
            owner: string;
            mintAuthority: string | null;
            freezeAuthority: string | null;
            name: string | null;
            symbol: string | null;
            uri: string | null;
        }[]
        > => {
        try {
            //TODO : batch them - getMultipleAccountsInfo
            const tokensInfo = await Promise.all(allTokens.map(async (token) => {
                const data = await connection.getParsedAccountInfo(token.mintAddress)
                return { mintAddress: token.mintAddress, data };
            }))
            const updatedTokensMetaData = allTokens.map((token) => {
                const info = tokensInfo.find(t => new PublicKey(t.mintAddress).equals(token.mintAddress));
                if (!info || !info.data.value) {
                    return token;
                }
                const accountData = (info?.data.value.data) as ParsedAccountData;
                return {
                    ...token,
                    mintAuthority: accountData.parsed.info.mintAuthority,
                    freezeAuthority: accountData.parsed.info.freezeAuthority
                }
            })
            return updatedTokensMetaData;
        } catch (e) {
            console.log(e);
            return allTokens;
        }
    }

    async function createToken() {
        try {
            if (!wallet.publicKey) {
                alert("connet wallet first");
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

            //This is the size of the Mint Account data structure.
            // The mint account stores ONLY core token mechanics - only token economics, not identity
            const mintLen = getMintLen([ExtensionType.MetadataPointer]);
            /* 
            size of the metadata extension data
            name, symobl, uri
             */
            const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

            const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

            const transaction = new Transaction().add(
                //1. creating mint account
                SystemProgram.createAccount({
                    fromPubkey: wallet.publicKey,
                    lamports,
                    space: mintLen,
                    newAccountPubkey: mintKeypair.publicKey,
                    programId: TOKEN_2022_PROGRAM_ID,
                }),
                //2. It attaches metadata capability to the mint account
                createInitializeMetadataPointerInstruction(mintKeypair.publicKey, wallet.publicKey, mintKeypair.publicKey, TOKEN_2022_PROGRAM_ID),
                //3. account becomes a token- sets token mint related params (decimals, authorities)
                createInitializeMintInstruction(mintKeypair.publicKey, tokenDecimals, wallet.publicKey, null, TOKEN_2022_PROGRAM_ID),
                //4. Writes the actual on-chain metadata into the mint account.        
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

            const sim = await connection.simulateTransaction(transaction);
            console.log(sim.value.logs);

            const signature = await wallet.sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, "confirmed")
            setMintKeyPair(mintKeypair);
            alert("Mint Created");
        } catch (e) {
            console.log(e)
        }
    }

    //for creating token using core  token spl program - NO METADATA
    const launchToken = async () => {
        if (!wallet.publicKey) {
            alert("Connect wallet first");
            return;
        }

        const newMintKeyPair = Keypair.generate();
        setMintKeyPair(newMintKeyPair);
        const lamports = await getMinimumBalanceForRentExemptMint(connection);
        const transaction = new Transaction().add(
            SystemProgram.createAccount({
                fromPubkey: wallet.publicKey,
                lamports,
                space: MINT_SIZE,
                newAccountPubkey: newMintKeyPair.publicKey,
                programId: TOKEN_PROGRAM_ID
            }),
            createInitializeMint2Instruction(newMintKeyPair.publicKey, tokenDecimals, wallet.publicKey, wallet.publicKey)
        )
        transaction.feePayer = wallet.publicKey;
        const recentBlockHash = (await connection.getLatestBlockhash()).blockhash;
        transaction.recentBlockhash = recentBlockHash;

        transaction.partialSign(newMintKeyPair);
        await wallet.sendTransaction(transaction, connection);
        getBalance();

        alert(`token mint created: ${newMintKeyPair.publicKey}`);

    }

    //TODO : owner can select, the token owned where mint auth is enabled - and aiardrop to given address
    const AirdropToAddress = async (mintPublicKey: PublicKey) => {
        try {
            if (!wallet.publicKey) {
                alert("Connect wallet first");
                return;
            }
            if (!mintPublicKey) {
                alert("Invalid mint address")
                return;
            }

            //finding the Associated Token Address for the receiver's account
            const accountAddress = getAssociatedTokenAddressSync(
                mintPublicKey,
                new PublicKey(mintToAddress),
                false,
                TOKEN_2022_PROGRAM_ID
            );

            const isAtaExists = await connection.getAccountInfo(accountAddress);

            if (!isAtaExists) {
                const transaction = new Transaction()
                    .add(createAssociatedTokenAccountInstruction(
                        wallet.publicKey,
                        accountAddress,
                        new PublicKey(mintToAddress),
                        mintPublicKey,
                        TOKEN_2022_PROGRAM_ID
                    ))
                const signature = await wallet.sendTransaction(transaction, connection);
                await connection.confirmTransaction(signature, "confirmed");
            }

            //TODO : need to check this math logic for js
            const mintTokenInstruction = createMintToInstruction(
                mintPublicKey,
                accountAddress,
                wallet.publicKey,
                mintAmount * (10 ** tokenDecimals),
                [],
                TOKEN_2022_PROGRAM_ID
            )
            const transaction2 = new Transaction().add(mintTokenInstruction);
            const signature = await wallet.sendTransaction(transaction2, connection);
            await connection.confirmTransaction(signature, "confirmed");
            await getBalance();
            /*
            Cant do this below : if (new PublicKey(mintToAddress) === wallet.publicKey) getAllTokens();
            as PublicKey is a object and objects in js are compared by reference, so they will never be same
            */
            if (new PublicKey(mintToAddress).equals(wallet.publicKey)) {
                //TODO : we should use polling
                setTimeout(() => {
                    getAllTokens();
                }, 1200);
            }


            alert(`${mintAmount} airdrop successful to address ${mintToAddress}`)
        } catch (e) {
            console.log("error:", e)
        }
    }

    const revokeMintAuthority = async (mintAddress: PublicKey[]) => {
        try {
            const transaction = new Transaction()
            mintAddress.forEach(address => {
                transaction.add(
                    createSetAuthorityInstruction(address, wallet.publicKey as PublicKey, AuthorityType.MintTokens, null)
                )
            });
            const signature = await wallet.sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, "confirmed");
            setSelectedTokens(new Set());
            if (allTokens) setAllTokens(await enrichMintAuthorities(allTokens));
            alert("mint authority revoked")
        } catch (e) {
            console.log(e);
        }
    }

    const revokeFreezeAuthority = async (mintAddress: PublicKey[]) => {
        try {
            const transaction = new Transaction()
            mintAddress.forEach(address => {
                transaction.add(
                    createSetAuthorityInstruction(address, wallet.publicKey as PublicKey, AuthorityType.FreezeAccount, null)
                )
            });
            const signature = await wallet.sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, "confirmed");
            setSelectedTokens(new Set());
            if (allTokens) setAllTokens(await enrichMintAuthorities(allTokens));
            alert("freeze authority revoked")
        } catch (e) {
            console.log(e);
        }
    }

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-slate-900/40 backdrop-blur">
                <button type="button" onClick={() => setExpandedLaunch((e) => !e)} className="w-full text-left px-6 pt-6 pb-2 border-b border-slate-800 flex items-center justify-between gap-2 hover:bg-slate-800/30 transition rounded-t-2xl">
                    <div>
                        <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-emerald-400/80 bg-emerald-400/10 px-3 py-1 rounded-full">
                            Launch new SPL token
                        </p>
                        <h2 className="mt-4 text-xl font-semibold text-slate-50">
                            Token Launchpad
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">
                            Define your token details and deploy the mint on Solana.
                        </p>
                    </div>
                    <span className={`shrink-0 text-slate-400 transition-transform ${expandedLaunch ? "rotate-180" : ""}`} aria-hidden>▼</span>
                </button>

                {expandedLaunch && (
                    <>
                        <div className="px-6 py-5 flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-slate-300">
                                    Token Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Solana Launch Token"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 transition"
                                    onChange={(e) => setTokenName(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-slate-300">
                                    Token Symbol
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. SLT"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 transition"
                                    onChange={(e) => setTokenSymbol(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-slate-300">
                                        Decimals
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        placeholder="e.g. 9"
                                        className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 transition [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        onChange={(e) => setTokenDecimals(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={createToken}
                                className="mt-2 inline-flex items-center justify-center rounded-xl border border-emerald-500/70 bg-emerald-500 text-sm font-semibold text-slate-950 px-4 py-2.5 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 focus:ring-offset-slate-950 transition"
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
                    </>
                )}
            </div>
            {mintKeyPair ?
                <div className="w-full max-w-md mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-slate-900/40 backdrop-blur px-4 py-3">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Mint address</p>
                    <p className="text-slate-200 text-sm font-mono break-all">{mintKeyPair.publicKey.toBase58()}</p>
                </div>
                : null
            }
            <div className="w-full max-w-md mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-slate-900/40 backdrop-blur">
                <button type="button" onClick={() => setExpandedAirdrop((e) => !e)} className="w-full text-left px-6 pt-5 pb-2 border-b border-slate-800 flex items-center justify-between gap-2 hover:bg-slate-800/30 transition rounded-t-2xl">
                    <div>
                        <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-amber-400/80 bg-amber-400/10 px-3 py-1 rounded-full">Airdrop</p>
                        <h3 className="mt-3 text-lg font-semibold text-slate-50">Send tokens</h3>
                        <p className="mt-1 text-sm text-slate-400">Mint to a wallet address.</p>
                    </div>
                    <span className={`shrink-0 text-slate-400 transition-transform ${expandedAirdrop ? "rotate-180" : ""}`} aria-hidden>▼</span>
                </button>
                {expandedAirdrop && (
                    <div className="px-6 py-5 flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-slate-300">Amount</label>
                            <input type="number" min={0} className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/40 transition [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="Enter the airdrop amount" onChange={(e) => {
                                setMintAmount(Number(e.target.value));
                            }} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-slate-300">Receiver address</label>
                            <input type="text" className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/40 transition" placeholder="Enter the receiver's address" onChange={(e) => {
                                setMintToAddress(e.target.value);
                            }} />
                        </div>
                        <button className="inline-flex items-center justify-center rounded-xl border border-amber-500/70 bg-amber-500 text-sm font-semibold text-slate-950 px-4 py-2.5 shadow-lg shadow-amber-500/30 hover:bg-amber-400 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:ring-offset-2 focus:ring-offset-slate-950 transition cursor-pointer" onClick={() => {
                            if (!mintKeyPair) {
                                alert("Select mint to airdrop");
                                return;
                            }
                            AirdropToAddress(mintKeyPair.publicKey)
                        }}
                        >Airdrop</button>
                    </div>
                )}
            </div>
            <div className="w-full max-w-md mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-slate-900/40 backdrop-blur px-5 py-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Solana balance in wallet</p>
                <p className="mt-1 text-xl font-semibold text-emerald-400">{solBalance != null ? solBalance : 0} SOL</p>
            </div>
            <div className="w-full mb-10 max-w-md mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-slate-900/40 backdrop-blur overflow-hidden">
                <button type="button" onClick={() => setExpandedTokens((e) => !e)} className="w-full text-left px-6 pt-5 pb-3 border-b border-slate-800 flex items-center justify-between gap-2 hover:bg-slate-800/30 transition rounded-t-2xl">
                    <div>
                        <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400/80 bg-slate-500/10 px-3 py-1 rounded-full">Wallet</p>
                        <h3 className="mt-3 text-lg font-semibold text-slate-50">Your tokens</h3>
                        <p className="mt-1 text-sm text-slate-400">Select tokens to revoke mint or freeze authority.</p>
                    </div>
                    <span className={`shrink-0 text-slate-400 transition-transform ${expandedTokens ? "rotate-180" : ""}`} aria-hidden>▼</span>
                </button>
                {expandedTokens && (
                    <div className="px-6 py-5 flex flex-col gap-4">
                        {allTokens ? (
                            <div className="flex flex-col gap-3">
                                {allTokens.map((token) => {
                                    //TODO (study about memoization) : const selected = useMemo(() => selectedTokens, [selectedTokens]);
                                    const isSelected = selectedTokens.has(token.mintAddress);
                                    console.log(token.symbol)
                                    console.log(token.uri)
                                    console.log(token)
                                    return (
                                        <div key={token.mintAddress.toString()} className="flex items-center gap-3 p-3 border border-slate-700 rounded-lg bg-slate-900/50">
                                            <input
                                                type={"checkbox"}
                                                checked={isSelected}
                                                onChange={(e) => {
                                                    setSelectedTokens(prev => {
                                                        const next = new Set(prev);
                                                        if (e.target.checked) next.add(token.mintAddress);
                                                        else next.delete(token.mintAddress);
                                                        return next;
                                                    })
                                                }}
                                                className={`w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 rounded focus:ring-emerald-500 focus:ring-2 ${(token.freezeAuthority && wallet.publicKey && new PublicKey(token.freezeAuthority).equals(wallet.publicKey)) ||
                                                    (token.mintAuthority && wallet.publicKey && new PublicKey(token.mintAuthority).equals(wallet.publicKey))
                                                    ? "block"
                                                    : "hidden"
                                                    } `}
                                            />
                                            <div className="flex-1 flex flex-col gap-1">
                                                <span className="text-white flex gap-4 text-sm font-mono">
                                                    {token.uri && <img src={token.uri} alt="token image" height={10} width={10} />}
                                                    {token.symbol ? <span>{token.symbol}</span> : token.mintAddress.toString()}
                                                </span>
                                                <span className="text-slate-400 text-xs">
                                                    Amount: {token.amount}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {wallet.publicKey && allTokens && allTokens.some(token =>
                                    selectedTokens.has(token.mintAddress) && token.owner === wallet.publicKey!.toBase58()
                                ) && (
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={() => {
                                                    const selectedOwnedTokens = Array.from(selectedTokens).filter(mintAddress => {
                                                        return allTokens.find(t => t.mintAddress === mintAddress)?.mintAddress;
                                                    });
                                                    revokeMintAuthority(selectedOwnedTokens);
                                                }}
                                                disabled={selectedTokens.size === 0}
                                                className="px-4 py-2 text-sm font-semibold rounded-lg border border-red-500/70 bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                            >
                                                Revoke Mint Authority
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const selectedOwnedTokens = Array.from(selectedTokens).filter(mintAddress => {
                                                        return allTokens.find(t => t.mintAddress === mintAddress)?.mintAddress;
                                                    });
                                                    revokeFreezeAuthority(selectedOwnedTokens);
                                                }}
                                                disabled={selectedTokens.size === 0}
                                                className="px-4 py-2 text-sm font-semibold rounded-lg border border-orange-500/70 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                            >
                                                Revoke Freeze Authority
                                            </button>
                                        </div>
                                    )}
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    )
}
