"""
Gallery Photo Model
Manages photo uploads and gallery functionality
"""

from sqlalchemy import Column, String, Text, Boolean, Integer, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from utils.db import Base


class GalleryPhoto(Base):
    """Photos uploaded to family tree galleries"""
    __tablename__ = 'gallery_photos'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tree_id = Column(UUID(as_uuid=True), ForeignKey('trees.id', ondelete='CASCADE'), nullable=False)
    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id', ondelete='CASCADE'), nullable=True)  # Nullable for general tree photos
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # File information
    file_path = Column(Text, nullable=False)
    original_filename = Column(Text, nullable=True)
    file_size = Column(Integer, nullable=True)  # Size in bytes
    mime_type = Column(String(100), nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    
    # Photo metadata
    caption = Column(Text, nullable=True)
    
    # Approval workflow
    approved = Column(Boolean, nullable=False, default=False)
    approved_by = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    approved_at = Column(TIMESTAMP, nullable=True)
    
    # Timestamps
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    tree = relationship("Tree", back_populates="gallery_photos")
    member = relationship("Member", back_populates="gallery_photos")
    uploader = relationship("User", foreign_keys=[uploaded_by], back_populates="uploaded_photos")
    approver = relationship("User", foreign_keys=[approved_by])
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'tree_id': str(self.tree_id),
            'member_id': str(self.member_id) if self.member_id else None,
            'uploaded_by': str(self.uploaded_by),
            'file_path': self.file_path,
            'original_filename': self.original_filename,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'width': self.width,
            'height': self.height,
            'caption': self.caption,
            'approved': self.approved,
            'approved_by': str(self.approved_by) if self.approved_by else None,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
    
    @property
    def file_url(self):
        """Generate the public URL for the photo"""
        # This would be configured based on your file storage setup
        # For local storage: return f"/uploads/gallery/{self.file_path}"
        # For S3/cloud storage: return the full URL
        return f"/uploads/gallery/{self.file_path}"
    
    @property
    def thumbnail_url(self):
        """Generate the thumbnail URL for the photo"""
        # This would generate a thumbnail version of the image
        base_path = self.file_path.rsplit('.', 1)
        if len(base_path) == 2:
            return f"/uploads/gallery/thumbnails/{base_path[0]}_thumb.{base_path[1]}"
        return self.file_url
    
    def is_image(self):
        """Check if the file is an image"""
        if not self.mime_type:
            return False
        return self.mime_type.startswith('image/')
    
    def get_file_size_formatted(self):
        """Get human-readable file size"""
        if not self.file_size:
            return "Unknown"
        
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"
