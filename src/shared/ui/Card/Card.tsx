import type { ReactNode } from 'react'
import styles from './Card.module.css'

export function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <section className={styles.card}>
      {title || right || subtitle ? (
        <header className={styles.header}>
          <div>
            {title ? <h3 className={styles.title}>{title}</h3> : null}
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>
          {right}
        </header>
      ) : null}
      <div className={styles.body}>{children}</div>
    </section>
  )
}

