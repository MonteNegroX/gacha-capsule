# Lend

A listed card is a 7-day loan on CapsuleLend. The collateral is the graded card in the Capsule vault. The token is USDG.

## Fund a listing

A funder deposits exactly the principal. That deposit is not a fee.

If the owner repays within 7 days, the funder receives the principal plus 3%. Capsule keeps 1%. Both percents are of the principal, and both are paid only when the loan is repaid.

If the term ends unpaid, the funder submits a Solana address and receives the card. Check the mint before you fund a card you do not already trust.

## List your own card

Connect the Solana wallet that holds the card and choose it. You sign a transfer of that one card into the Capsule vault. Capsule does not hold your Solana key. The card is not listed until that transfer is in the vault.

Connect the Robinhood wallet that should own the loan and sign the collateral message. That wallet can withdraw the deposit and repay within 7 days. The principal is from 1 to 500 USDG, with at most two decimal places.

The listing then waits for a funder to deposit that principal. Nothing is listed from a signature alone, and a deposit is not invented.

The owner can repay from their wallet before the term ends. After repayment, the funder can withdraw. A new fund is not opened on a card that is already held from an earlier loan.

Open listings are on [capsulepull.xyz/lend](https://www.capsulepull.xyz/lend). The homepage borrow desk shows the same book.
