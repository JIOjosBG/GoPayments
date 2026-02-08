package models

import (
	"time"
)

// TransferStatus represents the status of a transfer
type TransferStatus string

const (
	TransferStatusPending   TransferStatus = "pending"
	TransferStatusCompleted TransferStatus = "completed"
	TransferStatusFailed    TransferStatus = "failed"
)

// Transfer represents a transfer transaction
type Transfer struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`

	SourceUserID uint           `gorm:"not null;index" json:"source_user_id"`
	DestinationUserAddress string `gorm:"not null" json:"destination_user_address"`
	PaymentTemplateID *uint      `gorm:"index" json:"payment_template_id,omitempty"` // Optional: can be created from a template
	Amount    float64           `gorm:"not null" json:"amount"`
	AssetID   uint              `gorm:"not null;index" json:"asset_id"`
	Status    TransferStatus    `gorm:"not null;default:'pending'" json:"status"`

	// Relations
	SourceUser      User            `gorm:"foreignKey:SourceUserID" json:"source_user,omitempty"`
	PaymentTemplate *PaymentTemplate `gorm:"foreignKey:PaymentTemplateID" json:"payment_template,omitempty"`
	Asset           Asset           `gorm:"foreignKey:AssetID" json:"asset,omitempty"`
}

// TableName specifies the table name for Transfer
func (Transfer) TableName() string {
	return "transfers"
}
