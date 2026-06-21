import "@stdlib/deploy";

message SignedExecute {
    target: Address;
    value: Int as coins;
    payload: Cell;
    seqno: Int as uint32;
    signature: Cell;
}

contract TonGaslessWallet with Deployable {
    owner: Int as uint256;
    seqno: Int as uint32;

    init(owner: Int) {
        self.owner = owner;
        self.seqno = 0;
    }

    external(msg: SignedExecute) {
        let verifyMsg: Cell = beginCell()
            .storeAddress(msg.target)
            .storeCoins(msg.value)
            .storeSlice(msg.payload.beginParse())
            .storeUint(msg.seqno, 32)
            .endCell();

        let hash: Int = verifyMsg.hash();
        require(checkSignature(hash, msg.signature.beginParse(), self.owner), "invalid signature");
        require(msg.seqno == self.seqno, "invalid seqno");

        self.seqno += 1;

        send(SendParameters{
            to: msg.target,
            value: msg.value,
            body: msg.payload,
            mode: SendIgnoreErrors | SendPayGasSeparately | SendRemainingValue,
        });
    }

    receive() {
        // Accept incoming TON for funding wallet contract balance
    }

    get fun owner(): Int {
        return self.owner;
    }

    get fun seqno(): Int {
        return self.seqno;
    }
}
