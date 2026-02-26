import { PublicKey } from "@solana/web3.js";
import { memo, useState } from "react";

type Token = {
    mintAddress: PublicKey;
    amount: number;
    owner: string;
    mintAuthority: string | null;
    freezeAuthority: string | null;
    name: string | null;
    symbol: string | null;
    uri: string | null;
};

type TokenRowProps = {
    token: Token;
    isSelected: boolean;
    walletPublicKey: PublicKey | null;
    onToggle: (mintAddress: PublicKey, checked: boolean) => void;
};

const TokenRow = memo(({ token, isSelected, walletPublicKey, onToggle }: TokenRowProps) => {
    const [copiedMint, setCopiedMint] = useState(false);

    const hasMintAuthority = token.mintAuthority && walletPublicKey && new PublicKey(token.mintAuthority).equals(walletPublicKey);
    const hasFreezeAuthority = token.freezeAuthority && walletPublicKey && new PublicKey(token.freezeAuthority).equals(walletPublicKey);
    const hasAnyAuthority = hasMintAuthority || hasFreezeAuthority;

    const mintAddressShort = `${token.mintAddress.toBase58().slice(0, 4)}...${token.mintAddress.toBase58().slice(-4)}`;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedMint(true);
        setTimeout(() => setCopiedMint(false), 2000);
    };

    const getMintAuthorityStatus = () => {
        if (!token.mintAuthority) return { label: "Revoked", color: "gray", tooltip: "Mint authority has been permanently revoked" };
        if (hasMintAuthority) return { label: "You Control", color: "green", tooltip: "You have permission to create additional tokens" };
        return { label: "External", color: "gray", tooltip: "Another address controls mint authority" };
    };

    const getFreezeAuthorityStatus = () => {
        if (!token.freezeAuthority) return { label: "Revoked", color: "gray", tooltip: "Freeze authority has been permanently revoked" };
        if (hasFreezeAuthority) return { label: "You Control", color: "green", tooltip: "You have permission to freeze token accounts" };
        return { label: "External", color: "gray", tooltip: "Another address controls freeze authority" };
    };

    const mintStatus = getMintAuthorityStatus();
    const freezeStatus = getFreezeAuthorityStatus();

    return (
        <div className="relative flex items-center gap-6 p-5 border border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
            {hasAnyAuthority && (
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onToggle(token.mintAddress, e.target.checked)}
                    className="absolute top-4 right-4 w-5 h-5 text-emerald-600 bg-white border-gray-300 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer z-10"
                />
            )}

            <div className="flex items-center gap-3 flex-1 min-w-0 pr-8">
                <div className="flex-shrink-0">
                    {token.uri ? (
                        <img
                            src={token.uri}
                            alt={token.symbol || "Token"}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                    ) : null}
                    {!token.uri && (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                            <span className="text-emerald-700 font-semibold text-lg">T</span>
                        </div>
                    )}
                </div>

                {/* Token Info */}
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 text-sm">
                            {token.symbol || "Unknown Token"}
                        </span>
                    </div>
                    {token.name && (
                        <span className="text-xs text-gray-500">
                            {token.name}
                        </span>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5 group">
                        <span className="text-xs font-mono text-gray-400" title={token.mintAddress.toBase58()}>
                            {mintAddressShort}
                        </span>
                        <button
                            onClick={() => copyToClipboard(token.mintAddress.toBase58())}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                            title="Copy address"
                        >
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {copiedMint ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Balance */}
            <div className="flex flex-col items-end min-w-[120px]">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-0.5">
                    Balance
                </span>
                <span className="text-lg font-mono font-semibold text-gray-900">
                    {token.amount.toLocaleString()}
                </span>
            </div>

            {/* Authority Status */}
            <div className="flex flex-col gap-2 min-w-[160px]">
                {/* Mint Authority */}
                <div className="flex items-center gap-2 group relative">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium w-12">
                        Mint
                    </span>
                    <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium cursor-help ${mintStatus.color === "green"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-gray-50 text-gray-600 border border-gray-200"
                            }`}
                        title={mintStatus.tooltip}
                    >
                        {mintStatus.label}
                    </span>
                </div>

                {/* Freeze Authority */}
                <div className="flex items-center gap-2 group relative">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium w-12">
                        Freeze
                    </span>
                    <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium cursor-help ${freezeStatus.color === "green"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-gray-50 text-gray-600 border border-gray-200"
                            }`}
                        title={freezeStatus.tooltip}
                    >
                        {freezeStatus.label}
                    </span>
                </div>
            </div>
        </div>
    );
});

TokenRow.displayName = "TokenRow";

export default TokenRow;
