import React from 'react'
import Image from 'next/image'

interface PhyloLogoProps {
  className?: string
  size?: number
}

export const PhyloLogo: React.FC<PhyloLogoProps> = ({
  className = '',
  size = 24,
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/favicon.svg"
        alt="Phylo Logo"
        width={size}
        height={size}
        className="phylo-logo"
        priority
      />
    </div>
  )
}

export default PhyloLogo
