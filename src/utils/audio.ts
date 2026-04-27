const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null

export function playSuccessSound() {
  if (!audioCtx) return
  if (audioCtx.state === 'suspended') audioCtx.resume()

  const oscillator = audioCtx.createOscillator()
  const gainNode = audioCtx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime) // C5
  oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1) // C6

  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)

  oscillator.connect(gainNode)
  gainNode.connect(audioCtx.destination)

  oscillator.start()
  oscillator.stop(audioCtx.currentTime + 0.3)
}

export function playErrorSound() {
  if (!audioCtx) return
  if (audioCtx.state === 'suspended') audioCtx.resume()

  const oscillator = audioCtx.createOscillator()
  const gainNode = audioCtx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(150, audioCtx.currentTime)
  oscillator.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.15)

  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
  gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2)

  oscillator.connect(gainNode)
  gainNode.connect(audioCtx.destination)

  oscillator.start()
  oscillator.stop(audioCtx.currentTime + 0.2)
}
