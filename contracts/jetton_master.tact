import "@stdlib/deploy";
import "./jetton_wallet";

// ============================================================
// Messages
// ============================================================

message(0x1674b0a0) MintTokens {
    queryId: Int as uint64;
    amount: Int as coins;
    receiver: Address;
    responseDestination: Address?;
    forwardTonAmount: Int as coins;
}

message(0x6501f354) ChangeOwner {
    newOwner: Address;
}

message(0x9a4f3b2c) SetGameBackend {
    newBackend: Address;
}

// ============================================================
// Structs
// ============================================================

struct JettonData {
    totalSupply: Int;
    mintable: Bool;
    owner: Address;
    content: Cell;
    walletCode: Cell;
}

struct BurnStats {
    totalBurned: Int;
    gameBurned: Int;
    manualBurned: Int;
}

// ============================================================
// JettonMaster — $MOUSE token (TEP-74)
// ============================================================

contract JettonMaster {
    totalSupply: Int as coins;
    maxSupply: Int as coins;
    mintable: Bool;
    owner: Address;
    gameBackend: Address;

    // Burn stats for on-chain transparency
    totalBurned: Int as coins;
    gameBurned: Int as coins;
    manualBurned: Int as coins;

    init(owner: Address, maxSupply: Int, gameBackend: Address, version: Int) {
        self.owner = owner;
        self.maxSupply = maxSupply;
        self.totalSupply = 0;
        self.mintable = true;
        self.gameBackend = gameBackend;
        self.totalBurned = 0;
        self.gameBurned = 0;
        self.manualBurned = 0;
    }

    // Mint tokens (only owner)
    receive(msg: MintTokens) {
        let ctx = context();
        require(ctx.sender == self.owner, "JettonMaster: not owner");
        require(self.mintable, "JettonMaster: minting disabled");
        require(self.totalSupply + msg.amount <= self.maxSupply, "JettonMaster: exceeds max supply");
        require(ctx.value > ton("0.1"), "JettonMaster: insufficient TON");

        self.totalSupply += msg.amount;

        let walletInit = initOf JettonWallet(myAddress(), msg.receiver);

        send(SendParameters{
            to: contractAddress(walletInit),
            value: 0,
            bounce: true,
            mode: SendRemainingValue,
            body: TokenTransferInternal{
                queryId: msg.queryId,
                amount: msg.amount,
                from: self.owner,
                responseDestination: msg.responseDestination,
                forwardTonAmount: msg.forwardTonAmount,
                forwardPayload: emptySlice(),
            }.toCell(),
            code: walletInit.code,
            data: walletInit.data,
        });
    }

    // Handle burn from wallet
    // gameBackend flag in responseDestination = null means game burn
    receive(msg: TokenBurnNotification) {
        let expectedWallet = contractAddress(initOf JettonWallet(myAddress(), msg.sender));
        require(context().sender == expectedWallet, "JettonMaster: unauthorized burn");

        self.totalSupply -= msg.amount;
        self.totalBurned += msg.amount;

        // If responseDestination is null — it's a game burn (no refund needed)
        // If responseDestination set — it's a manual burn (return excess TON)
        if (msg.responseDestination != null) {
            self.manualBurned += msg.amount;
            send(SendParameters{
                to: msg.responseDestination!!,
                value: 0,
                bounce: false,
                mode: SendRemainingValue,
                body: TokenExcesses{ queryId: msg.queryId }.toCell(),
            });
        } else {
            self.gameBurned += msg.amount;
        }
    }

    // Update game backend address (only owner)
    receive(msg: SetGameBackend) {
        require(context().sender == self.owner, "JettonMaster: not owner");
        self.gameBackend = msg.newBackend;
    }

    // Disable minting forever (irreversible)
    receive("DisableMint") {
        require(context().sender == self.owner, "JettonMaster: not owner");
        self.mintable = false;
    }

    // Transfer ownership
    receive(msg: ChangeOwner) {
        require(context().sender == self.owner, "JettonMaster: not owner");
        self.owner = msg.newOwner;
    }

    // Restore totalSupply if mint bounces
    bounced(msg: bounced<TokenTransferInternal>) {
        self.totalSupply -= msg.amount;
    }

    // ============================================================
    // Getters (TEP-74)
    // ============================================================

    get fun get_jetton_data(): JettonData {
        return JettonData{
            totalSupply: self.totalSupply,
            mintable: self.mintable,
            owner: self.owner,
            content: self.buildContent(),
            walletCode: codeOf JettonWallet,
        };
    }

    get fun get_wallet_address(owner: Address): Address {
        return contractAddress(initOf JettonWallet(myAddress(), owner));
    }

    get fun totalSupply(): Int {
        return self.totalSupply;
    }

    get fun owner(): Address {
        return self.owner;
    }

    get fun mintable(): Bool {
        return self.mintable;
    }

    get fun gameBackend(): Address {
        return self.gameBackend;
    }

    get fun get_burn_stats(): BurnStats {
        return BurnStats{
            totalBurned: self.totalBurned,
            gameBurned: self.gameBurned,
            manualBurned: self.manualBurned,
        };
    }

    // ============================================================
    // Internal helpers
    // ============================================================

    // TEP-64 off-chain metadata
    // 0x01 flag + URL string in ref cell
    fun buildContent(): Cell {
        let url: String = "https://raw.githubusercontent.com/deviale/mouse_token/main/metadata/mouse.json";
        let sb: StringBuilder = beginString();
        sb.append(url);
        return beginCell()
            .storeUint(0x01, 8)
            .storeRef(sb.toCell())
            .endCell();
    }
}
