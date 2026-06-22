use anchor_lang::prelude::*;
use anchor_lang::solana_program::ed25519_program;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program::invoke;

declare_id!("Gn5qgu9TVMZiQXxspugbzVKEJZRx7fEiGCw8c472Rq18");

#[program]
pub mod nodius_relay {
    use super::*;

    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        let user_nonce = &mut ctx.accounts.user_nonce;
        user_nonce.user = ctx.accounts.user.key();
        user_nonce.nonce = 0;
        user_nonce.bump = ctx.bumps.user_nonce;
        Ok(())
    }

    pub fn relay_execute(
        ctx: Context<RelayExecute>,
        nonce: u64,
        deadline: i64,
        target_program: Pubkey,
        target_data: Vec<u8>,
        user_signature: [u8; 64],
    ) -> Result<()> {
        let user_nonce = &mut ctx.accounts.user_nonce;

        require!(
            Clock::get()?.unix_timestamp <= deadline,
            NodiusError::DeadlineExpired
        );

        require!(
            nonce == user_nonce.nonce,
            NodiusError::InvalidNonce
        );

        let mut message = Vec::new();
        message.extend_from_slice(b"nodius-relay-execute");
        message.extend_from_slice(&nonce.to_le_bytes());
        message.extend_from_slice(&deadline.to_le_bytes());
        message.extend_from_slice(target_program.as_ref());
        message.extend_from_slice(&target_data);

        verify_ed25519_signature(
            &ctx.accounts.user.key().to_bytes(),
            &message,
            &user_signature,
        )?;

        let cpi_ix = Instruction {
            program_id: target_program,
            accounts: ctx.remaining_accounts.iter().map(|a| {
                AccountMeta {
                    pubkey: *a.key,
                    is_signer: false,
                    is_writable: true,
                }
            }).collect(),
            data: target_data,
        };

        invoke(&cpi_ix, &ctx.remaining_accounts)?;

        user_nonce.nonce = nonce.checked_add(1).unwrap();

        emit!(RelayExecuted {
            user: ctx.accounts.user.key(),
            nonce,
            target_program,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 1,
        seeds = [b"user-nonce", user.key().as_ref()],
        bump
    )]
    pub user_nonce: Account<'info, UserNonce>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RelayExecute<'info> {
    pub fee_payer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user-nonce", user.key().as_ref()],
        bump = user_nonce.bump
    )]
    pub user_nonce: Account<'info, UserNonce>,

    /// CHECK: user identity verified via ed25519 signature
    pub user: UncheckedAccount<'info>,
}

#[account]
pub struct UserNonce {
    pub user: Pubkey,
    pub nonce: u64,
    pub bump: u8,
}

#[event]
pub struct RelayExecuted {
    pub user: Pubkey,
    pub nonce: u64,
    pub target_program: Pubkey,
}

#[error_code]
pub enum NodiusError {
    #[msg("Transaction deadline has expired")]
    DeadlineExpired,
    #[msg("Invalid nonce — possible replay attack")]
    InvalidNonce,
    #[msg("Ed25519 signature verification failed")]
    SignatureVerificationFailed,
}

fn verify_ed25519_signature(
    pubkey_bytes: &[u8; 32],
    message: &[u8],
    signature: &[u8; 64],
) -> Result<()> {
    let header = [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

    let mut data = Vec::with_capacity(header.len() + pubkey_bytes.len() + signature.len() + message.len());
    data.extend_from_slice(&header);
    data.extend_from_slice(pubkey_bytes);
    data.extend_from_slice(signature);
    data.extend_from_slice(message);

    let instruction = Instruction {
        program_id: ed25519_program::ID,
        accounts: vec![],
        data,
    };

    invoke(&instruction, &[]).map_err(|_| error!(NodiusError::SignatureVerificationFailed))
}
