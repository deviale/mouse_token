# $MOUSE Token — TON Blockchain

Official smart contract for the **$MOUSE** token, the in-game currency of the Mouse Telegram Mini App.

Built on **TON blockchain** using **Tact** language, fully compliant with [TEP-74 Jetton standard](https://github.com/ton-blockchain/TEPs/blob/master/text/0074-jettons-standard.md).

---

## Token Info

| Parameter | Value |
|---|---|
| Name | Mouse |
| Symbol | MOUSE |
| Total Supply | 1,000,000,000 |
| Decimals | 9 |
| Standard | TEP-74 (Jetton) |
| Network | TON Mainnet |

## Token Distribution

| Category | % | Amount |
|---|---|---|
| Community Rewards | 75% | 750,000,000 |
| Team (12-24m vesting) | 10% | 100,000,000 |
| Liquidity & Listings | 7% | 70,000,000 |
| Ecosystem Fund | 5% | 50,000,000 |
| Partnerships & Media | 3% | 30,000,000 |

---

## Project Structure

```
contracts/
  jetton_master.tact   — Main token contract (mint, burn, ownership)
  jetton_wallet.tact   — Per-user token wallet (transfer, burn)

scripts/
  deployJettonMaster.ts   — Deploy token and mint total supply to owner
  transferTokens.ts       — Transfer MOUSE to a single address
  batchTransfer.ts        — Airdrop MOUSE to multiple addresses
  disableMint.ts          — Lock minting forever (irreversible)
  checkBalance.ts         — Check MOUSE balance of any address
  transferOwnership.ts    — Transfer contract ownership

metadata/
  mouse.json   — Token metadata (name, symbol, image)
  mouse.png    — Token logo
```

---

## Setup

```bash
npm install
npx blueprint build
```

---

## Deploy

> Requires ~0.5 TON in your wallet for gas.

```bash
npx blueprint run deployJettonMaster --mainnet
```

After deploy, fill `JETTON_MASTER_ADDRESS` in all scripts.

---

## Scripts

### Transfer tokens to one address
Edit `scripts/transferTokens.ts` → set `RECIPIENT_ADDRESS` and `AMOUNT`:
```bash
npx blueprint run transferTokens --mainnet
```

### Airdrop to multiple addresses
Edit `scripts/batchTransfer.ts` → fill the `RECIPIENTS` array:
```bash
npx blueprint run batchTransfer --mainnet
```

### Check balance of any address
Edit `scripts/checkBalance.ts` → set `TARGET_ADDRESS` (or leave empty for your own):
```bash
npx blueprint run checkBalance --mainnet
```

### Disable minting forever
> ⚠️ Irreversible. Builds trust with investors.
```bash
npx blueprint run disableMint --mainnet
```

### Transfer contract ownership
> ⚠️ Use only to transfer to a multisig or DAO.
```bash
npx blueprint run transferOwnership --mainnet
```

---

## Verification

After deploy, verify the contract source code at:
**https://verifier.ton.org**

View on explorer:
**https://tonviewer.com/YOUR_CONTRACT_ADDRESS**

---

## Listing

To get the token verified in TON wallets and explorers, open a PR at:
**https://github.com/ton-blockchain/token-list**

---

## License

MIT
