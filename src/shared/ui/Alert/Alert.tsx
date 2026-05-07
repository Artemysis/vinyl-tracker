import type { ReactNode } from 'react'
import styles from './Alert.module.css'

export function Alert({
  title,
  children,
  variant = 'default',
}: {
  title: ReactNode
  children?: ReactNode
  variant?: 'default' | 'danger'
}) {
  return (
    <div className={[styles.alert, variant === 'danger' ? styles.danger : undefined].filter(Boolean).join(' ')}>
      <div className={styles.title}>{title}</div>
      {children ? <div className={styles.text}>{children}</div> : null}
    </div>
  )
}

