import "@stdlib/deploy";

// ============================================================
// Messages
// ============================================================

message(0x0f8a7ea5) TokenTransfer {
    queryId: Int as uint64;
    amount: Int as coins;
    destination: Address;
    responseDestination: Address?;
    customPayload: Cell?;
    forwardTonAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

message(0x178d4519) TokenTransferInternal {
    queryId: Int as uint64;
    amount: Int as coins;
    from: Address;
    responseDestination: Address?;
    forwardTonAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

message(0x7362d09c) TokenNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    from: Address;
    forwardPayload: Slice as remaining;
}

message(0x595f07bc) TokenBurn {
    queryId: Int as uint64;
    amount: Int as coins;
    responseDestination: Address?;
}

message(0x7bdd97de) TokenBurnNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    sender: Address;
    responseDestination: Address?;
}

message(0xd53276db) TokenExcesses {
    queryId: Int as uint64;
}

// ============================================================
// JettonWallet
// ============================================================

contract JettonWallet {
    balance: Int as coins;
    master: Address;
    owner: Address;

    init(master: Address, owner: Address) {
        self.balance = 0;
        self.master = master;
        self.owner = owner;
    }

    // Accept internal transfer from master or sibling wallet
    receive(msg: TokenTransferInternal) {
        let ctx = context();
        if (ctx.sender != self.master) {
            let expectedWallet = contractAddress(initOf JettonWallet(self.master, msg.from));
            require(ctx.sender == expectedWallet, "JettonWallet: unauthorized sender");
        }

        self.balance += msg.amount;

        if (msg.forwardTonAmount > 0) {
            send(SendParameters{
                to: self.owner,
                value: msg.forwardTonAmount,
                bounce: false,
                body: TokenNotification{
                    queryId: msg.queryId,
                    amount: msg.amount,
                    from: msg.from,
                    forwardPayload: msg.forwardPayload,
                }.toCell(),
            });
        }

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

    // Transfer tokens to another address
    receive(msg: TokenTransfer) {
        let ctx = context();
        require(ctx.sender == self.owner, "JettonWallet: not owner");
        require(self.balance >= msg.amount, "JettonWallet: insufficient balance");
        require(ctx.value > ton("0.1"), "JettonWallet: insufficient TON");

        self.balance -= msg.amount;

        let walletInit = initOf JettonWallet(self.master, msg.destination);

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
                forwardPayload: msg.forwardPayload,
            }.toCell(),
            code: walletInit.code,
            data: walletInit.data,
        });
    }

    // FIX: Restore balance if transfer bounces (prevents token loss)
    bounced(msg: bounced<TokenTransferInternal>) {
        self.balance += msg.amount;
    }

    // Burn tokens
    receive(msg: TokenBurn) {
        let ctx = context();
        require(ctx.sender == self.owner, "JettonWallet: not owner");
        require(self.balance >= msg.amount, "JettonWallet: insufficient balance");

        self.balance -= msg.amount;

        send(SendParameters{
            to: self.master,
            value: 0,
            bounce: true,
            mode: SendRemainingValue,
            body: TokenBurnNotification{
                queryId: msg.queryId,
                amount: msg.amount,
                sender: self.owner,
                responseDestination: msg.responseDestination,
            }.toCell(),
        });
    }

    // FIX: Restore balance if burn notification bounces
    bounced(msg: bounced<TokenBurnNotification>) {
        self.balance += msg.amount;
    }

    // ============================================================
    // Getters
    // ============================================================

    get fun balance(): Int {
        return self.balance;
    }

    get fun owner(): Address {
        return self.owner;
    }

    get fun master(): Address {
        return self.master;
    }
}
