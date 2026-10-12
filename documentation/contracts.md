# Contracts

Public addresses for the live packs. The same values are in [`.gitbook/vars.yaml`](.gitbook/vars.yaml).

## Robinhood Chain

| Name | Value |
| --- | --- |
| Site | https://www.capsulepull.xyz |
| Chain | Robinhood Chain, id 4663 |
| RPC | https://rpc.mainnet.chain.robinhood.com |
| Explorer | https://robinhoodchain.blockscout.com |
| USDG | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` |
| USDG decimals | 6 |
| Treasury | `0xd89D795dD6D8eB591A0BB0Cb5105a5EaD1d00E99` |
| CapsuleLend | `0xa7F89DE1FE71Aa4D37A9179231787b2aC1a4DcFc` |
| Solana vault | `41NaNu6LNhDStmzEqGZHvHsawjtaBTVbR9GZdnQJ3193` |

Pay a pack in USDG on chain id 4663, to the treasury. Fund and repay loans on CapsuleLend, in the same USDG. Buybacks and refunds are USDG from that treasury to the wallet that paid.

## Hyperliquid

| Name | Value |
| --- | --- |
| Chain | Hyperliquid, id 999 |
| RPC | https://rpc.hyperliquid.xyz/evm |
| Explorer | https://hyperevmscan.io |
| USDC | `0xb88339CB7199b77E23DB6E890353E22632Ba630f` |
| USDC decimals | 6 |
| Treasury | `0xd89D795dD6D8eB591A0BB0Cb5105a5EaD1d00E99` |

Hyperliquid USDC pays for `pokemon_25` and `garage_20` when the pay form is set to Hyperliquid. Gas on that network is HYPE. The buyback and any refund still leave Robinhood as USDG.

The Solana vault holds cards for the $25 pack and is the wallet that opens the Garage Pack. A buyback does not send that NFT to the player.

{% hint style="warning" %}
There is no Capsule token. There is no audit linked from these pages.
{% endhint %}
