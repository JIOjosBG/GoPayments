package models

import (
	"time"
)

// User represents a user in the system
type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`

	// Email and Username are optional to allow anonymous users
	Email    *string `gorm:"uniqueIndex;size:100" json:"email,omitempty"`
	Username *string `gorm:"uniqueIndex;size:50" json:"username,omitempty"`

	EthereumAddress string `gorm:"uniqueIndex;size:42;not null" json:"ethereum_address"`

	// Relations
	PaymentTemplates []PaymentTemplate `gorm:"foreignKey:UserID" json:"payment_templates,omitempty"`
}

// TableName specifies the table name for User
func (User) TableName() string {
	return "users"
}
