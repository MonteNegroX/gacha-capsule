export function choiceLabel(choice: string | null, draw: string | null): string {
  if (choice === 'DOUBLE' && draw === 'WIN') return 'Double win'
  if (choice === 'DOUBLE' && draw === 'LOSS') return 'Double loss'
  if (choice === 'BUYBACK') return 'Buyback'
  if (choice === 'DOUBLE') return 'Double'
  return 'Waiting'
}
