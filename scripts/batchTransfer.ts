import { toNano, Address, TonClient } from "@ton/ton";
import { JettonMaster } from "../build/JettonMaster/JettonMaster_JettonMaster";
import { JettonWallet } from "../build/JettonMaster/JettonMaster_JettonWallet";
import { NetworkProvider } from "@ton/blueprint";

// ============================================================
// Batch transfer $MOUSE tokens to multiple addresses (Airdrop)
//
// Usage:
//   npx blueprint run batchTransfer --mainnet
//
// Edit JETTON_MASTER_ADDRESS and RECIPIENTS list before running
// Each transfer costs ~0.15 TON in gas, plan accordingly
// ============================================================

const JETTON_MASTER_ADDRESS = "EQCeYQn_fua9g69y3ZXRPDdr6epHIOg6vhrZGkeeIwmzW01H"; // Fill after deploy

// Airdrop list: { address, amount in MOUSE (without decimals) }
const RECIPIENTS: { address: string; amount: bigint }[] = [
    // Example:
    // { address: "UQA...", amount: 10_000n },
    // { address: "UQB...", amount: 5_000n },
];

const DECIMALS = 9n;
const GAS_PER_TRANSFER = toNano("0.15"); // TON gas per transfer
const DELAY_MS = 2000; // 2 sec between transfers to avoid congestion

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function run(provider: NetworkProvider) {
    if (!JETTON_MASTER_ADDRESS) {
        throw new Error("Set JETTON_MASTER_ADDRESS before running");
    }
    if (RECIPIENTS.length === 0) {
        throw new Error("RECIPIENTS list is empty");
    }

    const masterAddress = Address.parse(JETTON_MASTER_ADDRESS);
    const master = provider.open(JettonMaster.fromAddress(masterAddress));

    // Get sender's JettonWallet
    const senderWalletAddress = await master.getGetWalletAddress(
        provider.sender().address!
    );
    const senderWallet = provider.open(
        JettonWallet.fromAddress(senderWalletAddress)
    );

    // Check total balance
    const balance = await senderWallet.getBalance();
    const totalToSend = RECIPIENTS.reduce(
        (sum, r) => sum + r.amount * 10n ** DECIMALS,
        0n
    );

    console.log("=".repeat(50));
    console.log("$MOUSE Airdrop");
    console.log("=".repeat(50));
    console.log("Recipients:    ", RECIPIENTS.length);
    console.log("Total MOUSE:   ", (totalToSend / 10n ** DECIMALS).toString());
    console.log("Current balance:", (balance / 10n ** DECIMALS).toString());
    console.log(
        "Est. TON gas:  ",
        (BigInt(RECIPIENTS.length) * GAS_PER_TRANSFER) / toNano("1"),
        "TON"
    );
    console.log("=".repeat(50));

    if (balance < totalToSend) {
        throw new Error(
            `Insufficient balance. Need ${totalToSend / 10n ** DECIMALS} MOUSE, have ${balance / 10n ** DECIMALS}`
        );
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < RECIPIENTS.length; i++) {
        const { address, amount } = RECIPIENTS[i];
        const amountWithDecimals = amount * 10n ** DECIMALS;

        try {
            const recipient = Address.parse(address);

            await senderWallet.send(
                provider.sender(),
                { value: GAS_PER_TRANSFER },
                {
                    $$type: "TokenTransfer",
                    queryId: BigInt(Date.now() + i),
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

            console.log(
                `[${i + 1}/${RECIPIENTS.length}] ✅ Sent ${amount} MOUSE → ${address}`
            );
            successCount++;
        } catch (e) {
            console.log(
                `[${i + 1}/${RECIPIENTS.length}] ❌ Failed → ${address}: ${e}`
            );
            failCount++;
        }

        // Delay between transfers
        if (i < RECIPIENTS.length - 1) {
            await sleep(DELAY_MS);
        }
    }

    console.log("=".repeat(50));
    console.log(`Airdrop complete: ${successCount} success, ${failCount} failed`);
    console.log("=".repeat(50));
}
