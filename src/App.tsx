import "./App.css";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { useEffect, useState } from "react";
import * as buffer from "buffer";

window.Buffer = buffer.Buffer;
// create types
type DisplayEncoding = "utf8" | "hex";

type PhantomEvent = "disconnect" | "connect" | "accountChanged";
type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

// create a provider interface (hint: think of this as an object) to store the Phantom Provider
interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

/**
 * @description gets Phantom provider, if it exists
 */
const getProvider = (): PhantomProvider | undefined => {
  if ("solana" in window) {
    // @ts-ignore
    const provider = window.solana as any;
    if (provider.isPhantom) return provider as PhantomProvider;
  }
};

function App() {
  // create state variable for the provider
  const [provider, setProvider] = useState<PhantomProvider | undefined>(
    undefined
  );

  // create state variable for the wallet key
  const [walletKey, setWalletKey] = useState<PhantomProvider | undefined>(
    undefined
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let newAccount: Keypair;

  // this is the function that runs whenever the component updates (e.g. render, refresh)
  useEffect(() => {
    const provider = getProvider();

    // if the phantom provider exists, set this as the provider
    if (provider) setProvider(provider);
    else setProvider(undefined);
  }, []);

  /**
   * @description prompts user to connect wallet if it exists.
   * This function is called when the connect wallet button is clicked
   */
  const connectWallet = async () => {
    // @ts-ignore
    const { solana } = window;

    // checks if phantom wallet exists
    if (solana) {
      try {
        // connects wallet and returns response which includes the wallet public key
        const response = await solana.connect();
        console.log("wallet account ", response.publicKey.toString());
        // update walletKey to be the public key
        setWalletKey(response.publicKey.toString());
      } catch (err) {
        // { code: 4001, message: 'User rejected the request.' }
      }
    }
  };

  const disconnectWallet = async () => {
    setWalletKey(undefined);
  };

  const createAndAirdropToNewAccount = async () => {
    try {
      newAccount = Keypair.generate();
      console.log("New Account created: ", newAccount.publicKey.toString());

      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

      console.log("Airdrop requested to: ", newAccount.publicKey.toString());
      const fromAirDropSignature = await connection.requestAirdrop(
        newAccount.publicKey,
        2 * LAMPORTS_PER_SOL
      );

      let latestBlockhash = await connection.getLatestBlockhash();

      await connection.confirmTransaction({
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        signature: fromAirDropSignature,
      });

      console.log("Airdrop confirmed");
    } catch (err) {
      console.log(err);
    }
  };

  const transfer2SolToConnectedWallet = async () => {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    // @ts-ignore
    const { solana } = window;
    if (solana) {
      try {
        const response = await solana.connect();
        let toWalletBalance = await getWalletBalance(response.publicKey);
        let fromWalletBalance = await getWalletBalance(newAccount.publicKey);
        console.log("Starting connected wallet balance: ", toWalletBalance);
        console.log(
          "Starting newly created wallet balance: ",
          fromWalletBalance
        );

        var transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: newAccount.publicKey,
            toPubkey: response.publicKey,
            lamports: LAMPORTS_PER_SOL,
          })
        );

        // Sign transaction
        var signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [newAccount]
        );
        console.log("Transfer signature", signature);

        toWalletBalance = await getWalletBalance(response.publicKey);
        fromWalletBalance = await getWalletBalance(newAccount.publicKey);
        console.log("Finished connected wallet balance: ", toWalletBalance);
        console.log(
          "Finished newly created wallet balance: ",
          fromWalletBalance
        );
      } catch (err) {
        console.log(err);
      }
    }
  };

  const getWalletBalance = async (publicKey: PublicKey) => {
    try {
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const walletBalance = await connection.getBalance(
        new PublicKey(publicKey)
      );
      return walletBalance;
    } catch (err) {
      console.log(err);
    }
  };
  // HTML code for the app
  return (
    <div className="App">
      <div className="Navbar">
        {provider && walletKey && (
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={createAndAirdropToNewAccount}
          >
            Create a new Solana account
          </button>
        )}
        {provider && walletKey && (
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={transfer2SolToConnectedWallet}
          >
            Transfer to a new wallet
          </button>
        )}
        {provider && walletKey && (
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={disconnectWallet}
          >
            Disconnect
          </button>
        )}
      </div>
      <header className="App-header">
        <h2>Connect to Phantom Wallet</h2>
        {provider && !walletKey && (
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={connectWallet}
          >
            Connect Wallet
          </button>
        )}
        {provider && walletKey && <p>{provider.publicKey?.toString()}</p>}

        {!provider && (
          <p>
            No provider found. Install{" "}
            <a href="https://phantom.app/">Phantom Browser extension</a>
          </p>
        )}
      </header>
    </div>
  );
}

export default App;
