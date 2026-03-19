import { toNano, Address } from "@ton/ton";
import { JettonMaster } from "../build/JettonMaster/JettonMaster_JettonMaster";
import { JettonWallet } from "../build/JettonMaster/JettonMaster_JettonWallet";
import { NetworkProvider } from "@ton/blueprint";

// ============================================================
// Transfer $MOUSE tokens to a single address
//
// Usage:
//   npx blueprint run transferTokens --mainnet
//
// Edit RECIPIENT and AMOUNT before running
// ============================================================

const JETTON_MASTER_ADDRESS = ""; // Fill after deploy
const RECIPIENT_ADDRESS = "";     // Receiver TON address
const AMOUNT = 1_000_000n;        // Amount of MOUSE (without decimals)
const DECIMALS = 9n;

export async function run(provider: NetworkProvider) {
    if (!JETTON_MASTER_ADDRESS) {
        throw new Error("Set JETTON_MASTER_ADDRESS before running");
    }
    if (!RECIPIENT_ADDRESS) {
        throw new Error("Set RECIPIENT_ADDRESS before running");
    }

    const masterAddress = Address.parse(JETTON_MASTER_ADDRESS);
    const recipient = Address.parse(RECIPIENT_ADDRESS);
    const amountWithDecimals = AMOUNT * 10n ** DECIMALS;

    const master = provider.open(JettonMaster.fromAddress(masterAddress));

    // Get sender's JettonWallet address
    const senderWalletAddress = await master.getGetWalletAddress(
        provider.sender().address!
    );

    console.log("Sender wallet:", senderWalletAddress.toString());
    console.log("Recipient:", recipient.toString());
    console.log("Amount:", AMOUNT.toString(), "MOUSE");

    const senderWallet = provider.open(
        JettonWallet.fromAddress(senderWalletAddress)
    );

    // Check balance
    const balance = await senderWallet.getBalance();
    console.log("Current balance:", (balance / 10n ** DECIMALS).toString(), "MOUSE");

    if (balance < amountWithDecimals) {
        throw new Error("Insufficient balance");
    }

    await senderWallet.send(
        provider.sender(),
        { value: toNano("0.15") },
        {
            $$type: "TokenTransfer",
            queryId: BigInt(Date.now()),
            amount: amountWithDecimals,
            destination: recipient,
            responseDestination: provider.sender().address!,
            customPayload: null,
            forwardTonAmount: toNano("0.01"),
            forwardPayload: {
                bits: 0,
                refs: [],
            } as any,
        }
    );

    console.log("\n✅ Transfer sent!");
    console.log(`Sent ${AMOUNT} MOUSE to ${RECIPIENT_ADDRESS}`);
}
