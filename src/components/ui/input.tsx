import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils.ts'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-base text-[#f3f6f3] outline-none placeholder:text-[#6f7872] focus-visible:border-[#3dff7a]',
        className,
      )}
      {...props}
    />
  )
}
