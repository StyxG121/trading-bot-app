import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'

export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog.Root>
  )
}

export function SheetContent({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
      <Dialog.Content
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[86dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-[#121513] px-4 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl ring-1 ring-white/10',
        )}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />
        <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
        <Dialog.Description className="sr-only">Settings for the Trading Bot dashboard.</Dialog.Description>
        <div className="mt-4">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  )
}

export function SheetClose({ children }: { children: ReactNode }) {
  return <Dialog.Close asChild>{children}</Dialog.Close>
}
