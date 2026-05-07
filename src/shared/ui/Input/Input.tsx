import type { InputHTMLAttributes, ReactNode } from 'react'
import styles from './Input.module.css'

export function InputField({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode }) {
  return (
    <label className={styles.field}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <input {...props} className={styles.input} />
    </label>
  )
}

