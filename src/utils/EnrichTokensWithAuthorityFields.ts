import { Connection, PublicKey, type ParsedAccountData } from "@solana/web3.js";

const EnrichTokensWithAuthoritiesField = async (
  allTokens: {
    mintAddress: PublicKey;
    amount: number;
    owner: string;
    mintAuthority: string | null;
    freezeAuthority: string | null;
    name: string | null;
    symbol: string | null;
    uri: string | null;
    decimals: number;
  }[], connection : Connection
): Promise<
  {
    mintAddress: PublicKey;
    amount: number;
    owner: string;
    mintAuthority: string | null;
    freezeAuthority: string | null;
    name: string | null;
    symbol: string | null;
    uri: string | null;
    decimals: number;
  }[]
> => {
  try {
    //TODO : batch them - getMultipleAccountsInfo
    const tokensInfo = await Promise.all(
      allTokens.map(async (token) => {
        const data = await connection.getParsedAccountInfo(token.mintAddress);
        return { mintAddress: token.mintAddress, data };
      }),
    );
    const updatedTokensMetaData = allTokens.map((token) => {
      const info = tokensInfo.find((t) =>
        new PublicKey(t.mintAddress).equals(token.mintAddress),
      );
      if (!info || !info.data.value) {
        return token;
      }
      const accountData = info?.data.value.data as ParsedAccountData;
      return {
        ...token,
        mintAuthority: accountData.parsed.info.mintAuthority,
        freezeAuthority: accountData.parsed.info.freezeAuthority,
      };
    });
    return updatedTokensMetaData;
  } catch (e) {
    console.log(e);
    return allTokens;
  }
};
export default EnrichTokensWithAuthoritiesField;
