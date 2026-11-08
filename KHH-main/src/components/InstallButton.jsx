import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import toast from 'react-hot-toast'

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
const isIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent)

export default function InstallButton() {
  const [prompt, setPrompt] = useState(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setPrompt(e)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || (!prompt && !isIOS())) return null

  const install = async () => {
    if (!prompt) return toast('On iPhone: tap Share, then Add to Home Screen.', { duration: 6000 })
    prompt.prompt()
    await prompt.userChoice
    setPrompt(null)
  }

  return (
    <button type="button" onClick={install} className="btn-ghost inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-2xs">
      <Download className="w-3.5 h-3.5" />
      Install the app
    </button>
  )
}
