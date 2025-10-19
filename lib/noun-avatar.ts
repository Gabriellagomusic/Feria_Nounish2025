/**
 * Genera un ID de Noun consistente basado en una wallet address
 * @param address - La dirección de la wallet
 * @returns Un número entre 0 y 999 para usar como ID del Noun
 */
export function getNounIdFromAddress(address: string | undefined): number {
  if (!address) {
    // Si no hay address, usar un número random pero consistente
    return 42
  }

  // Crear un hash simple de la address
  let hash = 0
  for (let i = 0; i < address.length; i++) {
    const char = address.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }

  // Convertir a un número positivo entre 0 y 999
  return Math.abs(hash) % 1000
}

/**
 * Obtiene la URL de la imagen del Noun para una wallet address
 * @param address - La dirección de la wallet
 * @returns La URL de la imagen del Noun
 */
export function getNounAvatarUrl(address: string | undefined): string {
  const nounId = getNounIdFromAddress(address)
  return `https://noun.pics/${nounId}`
}
