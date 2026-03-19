import { toNano, Address } from "@ton/ton";
import { JettonMaster } from "../build/JettonMaster/JettonMaster_JettonMaster";
import { NetworkProvider } from "@ton/blueprint";

// ============================================================
// $MOUSE Token — Deploy & Mint
// ============================================================

const OWNER_ADDRESS = "UQBdAXZ-wu-N-0PxeeVP8mCzERYSDXgMPOA7kHsEArUFGLTq";
const TOTAL_SUPPLY = 1_000_000_000n; // 1 billion
const DECIMALS = 9n;
const TOTAL_SUPPLY_WITH_DECIMALS = TOTAL_SUPPLY * 10n ** DECIMALS;

export async function run(provider: NetworkProvider) {
    const owner = Address.parse(OWNER_ADDRESS);

    console.log("Deploying $MOUSE JettonMaster...");
    console.log("Owner:", OWNER_ADDRESS);
    console.log("Max Supply:", TOTAL_SUPPLY.toString(), "MOUSE");

    const jettonMaster = provider.open(
        await JettonMaster.fromInit(owner, TOTAL_SUPPLY_WITH_DECIMALS)
    );

    await jettonMaster.send(
        provider.sender(),
        { value: toNano("0.5") },
        {
            $$type: "MintTokens",
            queryId: 0n,
            amount: TOTAL_SUPPLY_WITH_DECIMALS,
            receiver: owner,
            responseDestination: owner,
            forwardTonAmount: toNano("0.05"),
        }
    );

    await provider.waitForDeploy(jettonMaster.address);

    console.log("\n✅ JettonMaster deployed at:", jettonMaster.address.toString());
    console.log("✅ Minted", TOTAL_SUPPLY.toString(), "MOUSE to", OWNER_ADDRESS);
    console.log("\nNext steps:");
    console.log("1. Verify at: https://verifier.ton.org");
    console.log("2. View:      https://tonviewer.com/" + jettonMaster.address.toString());
}
