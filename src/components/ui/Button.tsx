import React from 'react'
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid'|'ghost', size?: 'sm'|'md'|'lg' }
export const Button: React.FC<Props> = ({ className='', variant='solid', size='md', ...props }) => {
  const base = 'rounded-2xl font-semibold transition active:scale-[.98]'
  const variants = {
    solid: 'bg-brand-500 hover:bg-brand-600 text-slate-900 shadow glow',
    ghost: 'bg-transparent hover:bg-slate-800/60 border border-slate-700/60 text-slate-100',
  }[variant]
  const sizes = { sm:'px-3 py-1.5 text-sm', md:'px-4 py-2', lg:'px-6 py-3 text-lg' }[size]
  return <button className={`${base} ${variants} ${sizes} ${className}`} {...props} />
}
