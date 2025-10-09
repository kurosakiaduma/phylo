import { Modal, Header, Body, Close } from '@zendeskgarden/react-modals'
import React, { ReactNode } from 'react'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

const Drawer = ({ children, isOpen, onClose }: DrawerProps) => {
  if (!isOpen) return null

  return (
    <Modal onClose={onClose}>
      <Header tag="h2">Search</Header>
      <Body>{children}</Body>
      <Close aria-label="Close modal" />
    </Modal>
  )
}

export default Drawer
