import React from 'react'
type Props = React.InputHTMLAttributes<HTMLInputElement>
export const Input: React.FC<Props> = ({ className='', ...props }) => {
  return <input className={`rounded-xl bg-slate-900/80 border border-slate-700/60 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500/50 ${className}`} {...props} />
}
