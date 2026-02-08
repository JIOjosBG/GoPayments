package models

import (
	"time"
)

// PaymentTemplate represents a reusable payment template
type PaymentTemplate struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`

	UserID      uint   `gorm:"not null;index" json:"user_id"`
	Name        string `gorm:"not null" json:"name"`
	IsCancelled bool   `gorm:"not null;" json:"is_cancelled"`

	ScheduledAt         *time.Time `json:"scheduled_at,omitempty"`                // Nullable scheduled time
	RecurringInterval   *int64     `json:"recurring_interval,omitempty"`          // Nullable recurring interval (number, e.g. seconds)

	// Relations
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Transfers []Transfer `gorm:"foreignKey:PaymentTemplateID" json:"transfers,omitempty"`
}

// TableName specifies the table name for PaymentTemplate
func (PaymentTemplate) TableName() string {
	return "payment_templates"
}
