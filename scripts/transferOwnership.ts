import { toNano, Address } from "@ton/ton";
import { JettonMaster } from "../build/JettonMaster/JettonMaster_JettonMaster";
import { NetworkProvider } from "@ton/blueprint";

// ============================================================
// Transfer ownership of $MOUSE JettonMaster to a new address
//
// ⚠️  WARNING: After this, the NEW owner controls:
//     - minting, disabling mint, future ownership transfers
//     Only use this to transfer to a multisig or DAO contract.
//
// Usage:
//   npx blueprint run transferOwnership --mainnet
// ============================================================

const JETTON_MASTER_ADDRESS = "EQDoP8QEEGJxNc0SrHZljEJiFdJPxtL2Swie2QGrmMJgSD53"; // Fill after deploy
const NEW_OWNER_ADDRESS = "";     // New owner address

export async function run(provider: NetworkProvider) {
    if (!JETTON_MASTER_ADDRESS) {
        throw new Error("Set JETTON_MASTER_ADDRESS before running");
    }
    if (!NEW_OWNER_ADDRESS) {
        throw new Error("Set NEW_OWNER_ADDRESS before running");
    }

    const masterAddress = Address.parse(JETTON_MASTER_ADDRESS);
    const newOwner = Address.parse(NEW_OWNER_ADDRESS);
    const master = provider.open(JettonMaster.fromAddress(masterAddress));

    const data = await master.getGetJettonData();

    console.log("=".repeat(50));
    console.log("⚠️  TRANSFER OWNERSHIP");
    console.log("=".repeat(50));
    console.log("Contract:  ", masterAddress.toString());
    console.log("Current:   ", data.owner.toString());
    console.log("New owner: ", newOwner.toString());
    console.log("=".repeat(50));

    await master.send(
        provider.sender(),
        { value: toNano("0.05") },
        {
            $$type: "ChangeOwner",
            newOwner,
        }
    );

    console.log("\n✅ Ownership transfer sent!");
    console.log("New owner:", NEW_OWNER_ADDRESS);
}
