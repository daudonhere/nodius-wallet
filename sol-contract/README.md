# Solana Contract — NodiusRelay

Solana Anchor program untuk relay execution + gas sponsorship.

## Instructions

| Instruction | Description |
|-------------|-------------|
| `initializeUser` | Buat PDA nonce tracker untuk user |
| `relayExecute` | Verifikasi Ed25519 signature user → check nonce & deadline → CPI ke target program |

## Deploy

```bash
# Build
anchor build

# Deploy ke devnet
anchor deploy --provider.cluster devnet
```

### Dependency
```bash
solana-keygen new --force
```

## Flow

1. User sign message (nonce, deadline, target program, data) dengan ed25519
2. User kirim signature + params ke backend
3. Backend build tx: relayer sebagai fee_payer, `relayExecute` instruction
4. Program verifikasi signature via ed25519 precompile, execute CPI
5. Nonce increment — cegah replay attack
