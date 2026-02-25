import { useWallet } from '@solana/wallet-adapter-react'
import { ed25519 } from '@noble/curves/ed25519.js';

function SignMessage() {
    const wallet = useWallet()
    const { signMessage } = useWallet()


    const signMessageFunction = async () => {
        if (!wallet.publicKey) {
            alert("Wallet not connected");
            return;
        }
        if (!signMessage) {
            alert("Wallet doesn not support signing");
            return;
        }

        const message = (document.getElementById("message") as HTMLInputElement).value;
        const encodedMessage = new TextEncoder().encode(message);
        const signature = await signMessage(encodedMessage);

        if (!ed25519.verify(signature, encodedMessage, wallet.publicKey.toBytes())) {
            alert("Message signature invalid");
            return;
        }
        alert("Messaged signed successfuly");
    }

    return (
        <div className='flex justify-center '>

            <div className='flex bg-gray-100 border rounded-2xl items-center p-2 min-w-3xl flex-col gap-5 mt-10'>
                <span>Enter message to sign:</span>
                <input type="text" placeholder='message' id='message' className='border border-black' />
                <button onClick={signMessageFunction} className='border border-black cursor-pointer rounded-2xl p-2' >Sign message</button>
            </div>
        </div>
    )
}

export default SignMessage;