import { Address } from "@ton/ton";
import { JettonMaster } from "../build/JettonMaster/JettonMaster_JettonMaster";
import { JettonWallet } from "../build/JettonMaster/JettonMaster_JettonWallet";
import { NetworkProvider } from "@ton/blueprint";

// ============================================================
// Check $MOUSE token balance of any address
//
// Usage:
//   npx blueprint run checkBalance --mainnet
//
// Edit JETTON_MASTER_ADDRESS and TARGET_ADDRESS before running
// ============================================================

const JETTON_MASTER_ADDRESS = "EQCeYQn_fua9g69y3ZXRPDdr6epHIOg6vhrZGkeeIwmzW01H"; // Fill after deploy
const TARGET_ADDRESS = "";        // Address to check (leave empty to check your own)

const DECIMALS = 9n;

export async function run(provider: NetworkProvider) {
    if (!JETTON_MASTER_ADDRESS) {
        throw new Error("Set JETTON_MASTER_ADDRESS before running");
    }

    const masterAddress = Address.parse(JETTON_MASTER_ADDRESS);
    const master = provider.open(JettonMaster.fromAddress(masterAddress));

    // Determine address to check
    const checkAddress = TARGET_ADDRESS
        ? Address.parse(TARGET_ADDRESS)
        : provider.sender().address!;

    // Get jetton global info
    const jettonData = await master.getGetJettonData();

    console.log("=".repeat(50));
    console.log("$MOUSE Token Info");
    console.log("=".repeat(50));
    console.log("Master:       ", masterAddress.toString());
    console.log("Total supply: ", (jettonData.totalSupply / 10n ** DECIMALS).toLocaleString(), "MOUSE");
    console.log("Mintable:     ", jettonData.mintable ? "YES" : "NO (locked)");
    console.log("=".repeat(50));

    // Get wallet address for target
    const walletAddress = await master.getGetWalletAddress(checkAddress);

    try {
        const wallet = provider.open(JettonWallet.fromAddress(walletAddress));
        const balance = await wallet.getBalance();

        console.log("Address:      ", checkAddress.toString());
        console.log("Wallet:       ", walletAddress.toString());
        console.log("Balance:      ", (balance / 10n ** DECIMALS).toLocaleString(), "MOUSE");
        console.log(
            "Share:        ",
            jettonData.totalSupply > 0n
                ? ((Number(balance) / Number(jettonData.totalSupply)) * 100).toFixed(4) + "%"
                : "0%"
        );
    } catch {
        console.log("Address:      ", checkAddress.toString());
        console.log("Balance:      0 MOUSE (wallet not deployed yet)");
    }

    console.log("=".repeat(50));
}
