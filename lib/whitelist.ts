// Whitelist de wallets autorizadas para crear
const WHITELIST = new Set<string>([
  "0x697C7720dc08F1eb1fde54420432eFC6aD594244", // Wallet inicial en lowercase
])

/**
 * Verifica si una dirección de wallet está en el whitelist
 * @param addr - Dirección de la wallet a verificar
 * @returns true si la wallet está en el whitelist, false en caso contrario
 */
export function isWhitelisted(addr?: string): boolean {
  if (!addr) return false
  return WHITELIST.has(addr.toLowerCase())
}

/**
 * Obtiene el conjunto completo de wallets en el whitelist
 * @returns Set de direcciones en lowercase
 */
export function getWhitelist(): Set<string> {
  return new Set(WHITELIST)
}
