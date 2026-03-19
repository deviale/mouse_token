import { toNano, Address } from "@ton/ton";
import { JettonMaster } from "../build/JettonMaster/JettonMaster_JettonMaster";
import { JettonWallet } from "../build/JettonMaster/JettonMaster_JettonWallet";
import { NetworkProvider } from "@ton/blueprint";

// ============================================================
// Burn $MOUSE tokens — reduces total supply permanently
//
// Two modes:
//   MANUAL_AMOUNT — burn a specific amount
//   BURN_PERCENT  — burn X% of your current balance
//
// Usage:
//   npx blueprint run burnTokens --mainnet
// ============================================================

const JETTON_MASTER_ADDRESS = ""; // Fill after deploy

// Choose one mode:
const BURN_PERCENT = 0;           // e.g. 10 = burn 10% of your balance
const MANUAL_AMOUNT = 0n;         // e.g. 100_000_000n = burn 100M MOUSE

const DECIMALS = 9n;

export async function run(provider: NetworkProvider) {
    if (!JETTON_MASTER_ADDRESS) {
        throw new Error("Set JETTON_MASTER_ADDRESS before running");
    }
    if (BURN_PERCENT === 0 && MANUAL_AMOUNT === 0n) {
        throw new Error("Set either BURN_PERCENT or MANUAL_AMOUNT");
    }

    const masterAddress = Address.parse(JETTON_MASTER_ADDRESS);
    const master = provider.open(JettonMaster.fromAddress(masterAddress));

    const walletAddress = await master.getGetWalletAddress(
        provider.sender().address!
    );
    const wallet = provider.open(JettonWallet.fromAddress(walletAddress));

    const balance = await wallet.getBalance();
    const totalSupplyBefore = (await master.getGetJettonData()).totalSupply;

    // Calculate burn amount
    let burnAmount: bigint;
    if (BURN_PERCENT > 0) {
        burnAmount = (balance * BigInt(BURN_PERCENT)) / 100n;
    } else {
        burnAmount = MANUAL_AMOUNT * 10n ** DECIMALS;
    }

    if (balance < burnAmount) {
        throw new Error(
            `Insufficient balance. Have ${balance / 10n ** DECIMALS} MOUSE, trying to burn ${burnAmount / 10n ** DECIMALS}`
        );
    }

    console.log("=".repeat(50));
    console.log("🔥 $MOUSE Token Burn");
    console.log("=".repeat(50));
    console.log("Your balance:  ", (balance / 10n ** DECIMALS).toLocaleString(), "MOUSE");
    console.log("Burning:       ", (burnAmount / 10n ** DECIMALS).toLocaleString(), "MOUSE");
    console.log("Remaining:     ", ((balance - burnAmount) / 10n ** DECIMALS).toLocaleString(), "MOUSE");
    console.log("Total supply:  ", (totalSupplyBefore / 10n ** DECIMALS).toLocaleString(), "MOUSE");
    console.log("After burn:    ", ((totalSupplyBefore - burnAmount) / 10n ** DECIMALS).toLocaleString(), "MOUSE");
    console.log("Supply reduced:", (burnAmount / 10n ** DECIMALS).toLocaleString(), "MOUSE (-" +
        ((Number(burnAmount) / Number(totalSupplyBefore)) * 100).toFixed(2) + "%)");
    console.log("=".repeat(50));

    await wallet.send(
        provider.sender(),
        { value: toNano("0.1") },
        {
            $$type: "TokenBurn",
            queryId: BigInt(Date.now()),
            amount: burnAmount,
            responseDestination: provider.sender().address!,
        }
    );

    console.log("\n🔥 Burn transaction sent!");
    console.log(`${(burnAmount / 10n ** DECIMALS).toLocaleString()} MOUSE will be permanently destroyed.`);
    console.log("Check new total supply at: https://tonviewer.com/" + JETTON_MASTER_ADDRESS);
}
