import { createContext, useContext, useState } from 'react'

type Notification = {
  message: string
  type?: 'error' | 'warning' | 'info' | 'success'
  duration?: number
}

type NotificationContextType = {
  notify: (notification: Notification) => void
}

const NotificationContext = createContext<NotificationContextType>({
  notify: () => {},
})

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notification, setNotification] = useState<Notification | null>(null)

  const notify = (payload: Notification) => {
    const notificationType = payload.type || 'error'
    setNotification({
      ...payload,
      type: notificationType
    })
    setTimeout(() => setNotification(null), payload.duration || 5000)
  }

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      {notification && (
        <div className="toast toast-top toast-end z-[1000]">
          <div role="alert" className={`alert alert-${notification.type} alert-soft`}>
            <span>{notification.message}</span>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  )
}

export const useNotification = () => useContext(NotificationContext)

