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

// ============================================================
// JettonMaster — $MOUSE token (TEP-74)
// ============================================================

contract JettonMaster {
    totalSupply: Int as coins;
    maxSupply: Int as coins;
    mintable: Bool;
    owner: Address;

    init(owner: Address, maxSupply: Int) {
        self.owner = owner;
        self.maxSupply = maxSupply;
        self.totalSupply = 0;
        self.mintable = true;
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

    // Handle burn notification from wallet
    receive(msg: TokenBurnNotification) {
        let expectedWallet = contractAddress(initOf JettonWallet(myAddress(), msg.sender));
        require(context().sender == expectedWallet, "JettonMaster: unauthorized burn");

        self.totalSupply -= msg.amount;

        if (msg.responseDestination != null) {
            send(SendParameters{
                to: msg.responseDestination!!,
                value: 0,
                bounce: false,
                mode: SendRemainingValue,
                body: TokenExcesses{ queryId: msg.queryId }.toCell(),
            });
        }
    }

    // Disable minting forever
    receive("DisableMint") {
        require(context().sender == self.owner, "JettonMaster: not owner");
        self.mintable = false;
    }

    // Transfer ownership
    receive(msg: ChangeOwner) {
        require(context().sender == self.owner, "JettonMaster: not owner");
        self.owner = msg.newOwner;
    }

    // Handle bounced mint
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

    // ============================================================
    // Internal helpers
    // ============================================================

    fun buildContent(): Cell {
        // Off-chain metadata — замени URL после загрузки metadata/mouse.json на GitHub
        let url: String = "https://raw.githubusercontent.com/your-repo/tonsmart/main/metadata/mouse.json";
        let b: StringBuilder = beginString();
        b.append(url);
        return beginCell()
            .storeUint(0x01, 8)
            .storeRef(b.toCell())
            .endCell();
    }
}
