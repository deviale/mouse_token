import { toNano, Address } from "@ton/ton";
import { JettonMaster } from "../build/JettonMaster/JettonMaster_JettonMaster";
import { NetworkProvider } from "@ton/blueprint";

// ============================================================
// Disable $MOUSE minting FOREVER
//
// ⚠️  WARNING: This action is IRREVERSIBLE
//     After calling this, no new MOUSE tokens can ever be minted.
//     This builds trust with investors and the community.
//
// Usage:
//   npx blueprint run disableMint --mainnet
// ============================================================

const JETTON_MASTER_ADDRESS = ""; // Fill after deploy

export async function run(provider: NetworkProvider) {
    if (!JETTON_MASTER_ADDRESS) {
        throw new Error("Set JETTON_MASTER_ADDRESS before running");
    }

    const masterAddress = Address.parse(JETTON_MASTER_ADDRESS);
    const master = provider.open(JettonMaster.fromAddress(masterAddress));

    // Check current state
    const data = await master.getGetJettonData();
    const totalSupply = data.totalSupply / 10n ** 9n;

    console.log("=".repeat(50));
    console.log("⚠️  DISABLE MINT — IRREVERSIBLE ACTION");
    console.log("=".repeat(50));
    console.log("Contract:    ", masterAddress.toString());
    console.log("Total supply:", totalSupply.toString(), "MOUSE");
    console.log("Mintable:    ", data.mintable ? "YES (will be disabled)" : "NO (already disabled)");
    console.log("=".repeat(50));

    if (!data.mintable) {
        console.log("✅ Minting is already disabled. Nothing to do.");
        return;
    }

    console.log("Sending DisableMint transaction...");

    await master.send(
        provider.sender(),
        { value: toNano("0.05") },
        "DisableMint"
    );

    console.log("\n✅ DisableMint sent!");
    console.log("Minting is now permanently disabled.");
    console.log("Total supply is fixed at:", totalSupply.toString(), "MOUSE");
}
