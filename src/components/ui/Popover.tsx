import * as Popover from '@radix-ui/react-popover'
import React from 'react'

export const QPopover: React.FC<{trigger: React.ReactNode, children: React.ReactNode}> = ({ trigger, children }) => {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="card p-4 w-80" sideOffset={8}>
          {children}
          <Popover.Arrow className="fill-slate-800" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
