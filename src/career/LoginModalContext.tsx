import { createContext, useContext, useState, type ReactNode } from 'react'
import { useAuth } from './authStore'
import LoginModal from '../components/LoginModal'

interface LoginModalContextType {
  isOpen: boolean
  message: string
  openLoginModal: (message?: string, onSuccess?: () => void) => void
  closeLoginModal: () => void
  requireAuth: (action: () => void, message?: string) => boolean
}

const LoginModalContext = createContext<LoginModalContextType | null>(null)

export function LoginModalProvider({ children }: { children: ReactNode }) {
  const { isAuthed } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('사용하려면 로그인이 필요합니다')
  const [onSuccessCb, setOnSuccessCb] = useState<(() => void) | null>(null)

  const openLoginModal = (msg = '사용하려면 로그인이 필요합니다', onSuccess?: () => void) => {
    setMessage(msg)
    setOnSuccessCb(() => onSuccess ?? null)
    setIsOpen(true)
  }

  const closeLoginModal = () => {
    setIsOpen(false)
    setOnSuccessCb(null)
  }

  const requireAuth = (action: () => void, msg = '사용하려면 로그인이 필요합니다'): boolean => {
    if (isAuthed) {
      action()
      return true
    }
    openLoginModal(msg, action)
    return false
  }

  const handleSuccess = () => {
    closeLoginModal()
    if (onSuccessCb) {
      onSuccessCb()
    }
  }

  return (
    <LoginModalContext.Provider
      value={{
        isOpen,
        message,
        openLoginModal,
        closeLoginModal,
        requireAuth,
      }}
    >
      {children}
      <LoginModal
        isOpen={isOpen}
        onClose={closeLoginModal}
        message={message}
        onSuccess={handleSuccess}
      />
    </LoginModalContext.Provider>
  )
}

export function useLoginModal() {
  const ctx = useContext(LoginModalContext)
  if (!ctx) {
    throw new Error('useLoginModal must be used within a LoginModalProvider')
  }
  return ctx
}
