import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
import { AuthorityType, createSetAuthorityInstruction, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import TokenRow from "../components/TokenRow";
import EnrichTokensWithAuthoritiesField from "../utils/EnrichTokensWithAuthorityFields";
import EnrichTokenWithMetadata from "../utils/EnrichTokenWithMetadata";

export default function WalletTokensPage() {
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
    const [selectedTokens, setSelectedTokens] = useState<Set<PublicKey>>(new Set());
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [revokeAction, setRevokeAction] = useState<'mint' | 'freeze' | null>(null);


    const getAllTokens = useCallback(async () => {
        if (!wallet.publicKey) {
            alert("Connect your wallet first");
            return;
        };

        const spl_tokens = await connection.getParsedTokenAccountsByOwner(
            wallet.publicKey,
            { programId: TOKEN_PROGRAM_ID }
        )

        const tokens_program2022 = await connection.getParsedTokenAccountsByOwner(
            wallet.publicKey,
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
                uri: null,
                decimals: parsedInfo.tokenAmount.decimals
            }
        }).filter((token) => token.amount > 0);

        if (mintDetails.length !== 0) {
            const tokensEnrichedWithMetaData = await EnrichTokensWithAuthoritiesField(mintDetails, connection);
            let enriched = await EnrichTokenWithMetadata(tokensEnrichedWithMetaData, connection);
            setAllTokens(enriched);
        }
    }, [wallet.publicKey, connection]);

    useEffect(() => {
        getAllTokens();
    }, [getAllTokens]);

    const toggleToken = useCallback((mintAddress: PublicKey, checked: boolean) => {
        setSelectedTokens(prev => {
            const next = new Set(prev);
            if (checked) next.add(mintAddress);
            else next.delete(mintAddress);
            return next;
        });
    }, []);

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
            if (allTokens) setAllTokens(await EnrichTokensWithAuthoritiesField(allTokens, connection));
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
            if (allTokens) setAllTokens(await EnrichTokensWithAuthoritiesField(allTokens, connection));
            alert("freeze authority revoked")
        } catch (e) {
            console.log(e);
        }
    }

    const hasControlledTokens = allTokens?.some(token => {
        const hasMintAuth = token.mintAuthority && wallet.publicKey && new PublicKey(token.mintAuthority).equals(wallet.publicKey);
        const hasFreezeAuth = token.freezeAuthority && wallet.publicKey && new PublicKey(token.freezeAuthority).equals(wallet.publicKey);
        return hasMintAuth || hasFreezeAuth;
    });

    const handleRevokeClick = (action: 'mint' | 'freeze') => {
        setRevokeAction(action);
        setShowConfirmModal(true);
    };

    const confirmRevoke = async () => {
        const selectedOwnedTokens = Array.from(selectedTokens).filter(mintAddress => {
            return allTokens?.find(t => t.mintAddress === mintAddress)?.mintAddress;
        });

        if (revokeAction === 'mint') {
            await revokeMintAuthority(selectedOwnedTokens);
        } else if (revokeAction === 'freeze') {
            await revokeFreezeAuthority(selectedOwnedTokens);
        }

        setShowConfirmModal(false);
        setRevokeAction(null);
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 bg-gray-50">
            <div className="w-full max-w-180 rounded-2xl bg-white border border-gray-200 shadow-sm">
                <div className="w-full text-center px-8 pt-8 pb-6 border-b border-gray-100">
                    <h1 className="cal-sans text-5xl text-gray-900 mb-3">
                        Tokens
                    </h1>
                    <p className="text-base text-gray-500 mb-4">
                        Manage tokens in your wallet.
                    </p>
                </div>

                {/* Token List */}
                <div className="px-8 py-6">
                    {!allTokens ? (
                        <div className="text-center py-16">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
                            <p className="text-gray-500 text-sm">Loading tokens...</p>
                        </div>
                    ) : allTokens.length === 0 ? (
                        <div className="text-center py-16">
                            <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <p className="text-gray-500 text-base font-medium">No tokens found in this wallet.</p>
                        </div>
                    ) : !hasControlledTokens ? (
                        <div>
                            <div className="flex flex-col gap-4 mb-6">
                                {allTokens.map((token) => (
                                    <TokenRow
                                        key={token.mintAddress.toString()}
                                        token={token}
                                        isSelected={selectedTokens.has(token.mintAddress)}
                                        walletPublicKey={wallet.publicKey}
                                        onToggle={toggleToken}
                                    />
                                ))}
                            </div>
                            <div className="text-center py-8 border-t border-gray-100">
                                <p className="text-gray-500 text-sm">You do not control any token permissions in this wallet.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {allTokens.map((token) => (
                                <TokenRow
                                    key={token.mintAddress.toString()}
                                    token={token}
                                    isSelected={selectedTokens.has(token.mintAddress)}
                                    walletPublicKey={wallet.publicKey}
                                    onToggle={toggleToken}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {selectedTokens.size > 0 && (
                    <div className="sticky bottom-0 px-8 py-5 bg-white border-t border-gray-200 rounded-b-2xl">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">
                                {selectedTokens.size} token{selectedTokens.size > 1 ? 's' : ''} selected
                            </span>
                        </div>
                        <div className="flex gap-3 mb-3">
                            <button
                                onClick={() => handleRevokeClick('mint')}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-red-700 bg-white border-2 border-red-300 rounded-xl hover:bg-red-50 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-colors"
                            >
                                Revoke Mint Authority
                            </button>
                            <button
                                onClick={() => handleRevokeClick('freeze')}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-red-700 bg-white border-2 border-red-300 rounded-xl hover:bg-red-50 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-colors"
                            >
                                Revoke Freeze Authority
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 text-center">
                            ⚠️ Revoking authority permanently removes your control over the token.
                        </p>
                    </div>
                )}
            </div>

            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Confirm Authority Removal
                        </h3>
                        <p className="text-gray-600 text-sm mb-6">
                            This action cannot be undone. You will no longer be able to {revokeAction} this token.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    setRevokeAction(null);
                                }}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500/40 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRevoke}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-colors"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
