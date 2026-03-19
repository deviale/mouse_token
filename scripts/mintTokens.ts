import { toNano, Address } from "@ton/ton";
import { JettonMaster } from "../build/JettonMaster/JettonMaster_JettonMaster";
import { NetworkProvider } from "@ton/blueprint";

// ============================================================
// Mint $MOUSE tokens to owner wallet
// Run this if initial mint failed during deploy
// ============================================================

const JETTON_MASTER_ADDRESS = "EQBOTg9VpL4KkoQtMW2V3UpEcpsxIoj5cQQoaF3nNwKWGe4W";
const OWNER_ADDRESS = "UQBdAXZ-wu-N-0PxeeVP8mCzERYSDXgMPOA7kHsEArUFGLTq";

const TOTAL_SUPPLY = 1_000_000_000n;
const DECIMALS = 9n;
const AMOUNT = TOTAL_SUPPLY * 10n ** DECIMALS;

export async function run(provider: NetworkProvider) {
    const masterAddress = Address.parse(JETTON_MASTER_ADDRESS);
    const owner = Address.parse(OWNER_ADDRESS);

    const master = provider.open(JettonMaster.fromAddress(masterAddress));

    // Check current totalSupply
    const data = await master.getGetJettonData();
    console.log("Current totalSupply:", (data.totalSupply / 10n ** DECIMALS).toString(), "MOUSE");
    console.log("Mintable:", data.mintable);

    if (data.totalSupply >= AMOUNT) {
        console.log("✅ Already minted. Check your wallet balance.");
        return;
    }

    const toMint = AMOUNT - data.totalSupply;
    console.log("Minting:", (toMint / 10n ** DECIMALS).toString(), "MOUSE to", OWNER_ADDRESS);

    await master.send(
        provider.sender(),
        { value: toNano("1") }, // More TON for JettonWallet deployment
        {
            $$type: "MintTokens",
            queryId: BigInt(Date.now()),
            amount: toMint,
            receiver: owner,
            responseDestination: owner,
            forwardTonAmount: toNano("0.1"),
        }
    );

    console.log("\n✅ Mint sent! Check Tonviewer in 30 seconds:");
    console.log("https://tonviewer.com/" + OWNER_ADDRESS);
}
