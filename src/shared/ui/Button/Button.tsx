import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

type Variant = 'default' | 'primary' | 'danger'

export function Button({
  variant = 'default',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const variantClass =
    variant === 'primary' ? styles.primary : variant === 'danger' ? styles.danger : undefined

  return (
    <button
      {...props}
      className={[styles.button, variantClass, className].filter(Boolean).join(' ')}
    />
  )
}

