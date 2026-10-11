export function choiceMessage(orderId: string, choice: 'BUYBACK' | 'DOUBLE'): string {
  return `Capsule\nchoice\n${orderId}\n${choice}`
}

export function solanaMessage(orderId: string, address: string): string {
  return `Capsule\nsolana\n${orderId}\n${address}`
}
