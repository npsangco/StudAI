export const registerPWA = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      })
      if (registration.installing) {
        
      } else if (registration.waiting) {
        
      } else if (registration.active) {
        
      }
    } catch (error) {
      console.error(`Registration failed with ${error}`)
    }
  }
}