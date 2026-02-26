import {
  getMetadataPointerState,
  getTokenMetadata,
  TOKEN_2022_PROGRAM_ID,
  unpackMint,
} from "@solana/spl-token";
import { unpack, type TokenMetadata } from "@solana/spl-token-metadata";
import { Connection, PublicKey } from "@solana/web3.js";

const EnrichTokenWithMetadata = async (
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
  }[],
  connection: Connection,
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
  const enrichedTokensWithMetaData = await Promise.all(
    allTokens.map(async (token) => {
      try {
        const tokenMintAccount = await connection.getAccountInfo(
          token.mintAddress,
        );
        const unPackedMint = unpackMint(
          token.mintAddress,
          tokenMintAccount,
          TOKEN_2022_PROGRAM_ID,
        );
        const metaDataPointerState = getMetadataPointerState(unPackedMint);
        if (metaDataPointerState && metaDataPointerState.metadataAddress) {
          const metaDataAccountAddress = metaDataPointerState.metadataAddress;
          let metaData: TokenMetadata | null;
          if (new PublicKey(token.mintAddress).equals(metaDataAccountAddress)) {
            //it means token is created using metadata pointer, and in that  name,symbol,uri are  saved in same account (token mint)
            metaData = await getTokenMetadata(connection, token.mintAddress);
            if (metaData) {
              let imageUrl;
              try {
                const res = await fetch(metaData.uri);
                const json = await res.json();
                console.log("*********************", json);
                imageUrl = json.image;
              } catch (e) {
                console.log("failed to load offchain metadata", e);
              }
              return {
                ...token,
                name: metaData.name,
                symbol: metaData.symbol,
                uri: imageUrl,
              };
            }
            return token;
          }
          //this logic still needs to be implemented
          const metaDataAccountInfo = await connection.getAccountInfo(
            metaDataAccountAddress,
          );
          metaData = unpack(metaDataAccountInfo?.data);
          return token;
        }
        return token;
      } catch (e) {
        console.log("Error", e);
        return token;
      }
    }),
  );
  return enrichedTokensWithMetaData;
};
export default EnrichTokenWithMetadata;
