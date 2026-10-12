# Open a pack

Two packs take payment.

| Pack | Code | Price | After the open |
| --- | --- | --- | --- |
| Graded card | `pokemon_25` | 25 USDG or 25 USDC | Buyback or Double. See [Buyback and Double](buyback-and-double.md). |
| Garage Pack | `garage_20` | 20 USDG or 20 USDC | The car is sold on Solana. The buyback is paid in USDG. No Double. |

USDG is on Robinhood Chain. USDC is on Hyperliquid. The token addresses are on [Contracts](contracts.md).

1. Connect the wallet that will pay.
2. Choose Robinhood or Hyperliquid. Hyperliquid needs a little HYPE for gas.
3. Choose a live pack. Packs above $25 stay on Coming soon.
4. Send the pack price to the Capsule treasury.
5. Wait for the card. The reveal starts when the card is known. See [The reveal](the-reveal.md).

On the $25 pack you then choose Buyback or Double. You have 24 hours. If you do not choose, Capsule runs the buyback for you.

On the Garage Pack there is no choice. The open sells the car and queues the USDG buyback.

One payment opens one pack. A second payment is a second open. Finishing an order in one browser tab does not lock every other tab.

When a finished card is still on screen, and the pack is not waiting on a choice or still opening, **Open another pack** clears that open in this tab and brings back the pay form.

{% hint style="info" %}
Opening is offline when that pack's opener is not answering. This machine is restocking when the vault cannot cover one pack. Refresh and try again. A click that never starts an order does not charge you. A payment that arrives while the machine is offline or restocking is returned in USDG.
{% endhint %}

You can watch the reveal without paying at [capsulepull.xyz/?preview=reveal](https://www.capsulepull.xyz/?preview=reveal). The preview buttons do not send a transaction.
