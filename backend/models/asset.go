package models

import (
	"time"
)

// AssetSymbol represents the symbol of an asset
type AssetSymbol string

const (
	AssetSymbolUSDC AssetSymbol = "USDC"
	AssetSymbolETH  AssetSymbol = "ETH"
	AssetSymbolDAI  AssetSymbol = "DAI"
	AssetSymbolEURe AssetSymbol = "EURe"
	AssetSymbolJPYC AssetSymbol = "JPYC"
)

// Asset represents a crypto asset/currency
type Asset struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`

	Symbol          string `gorm:"uniqueIndex;not null;size:10" json:"symbol"`
	Name            string `gorm:"not null" json:"name"`
	Decimals        uint8  `gorm:"not null;default:18" json:"decimals"`
	ContractAddress string `gorm:"size:42" json:"contract_address,omitempty"` // For ERC-20 tokens
	ChainID         uint64 `gorm:"not null;default:1" json:"chain_id"`        // The blockchain network's chain ID
}

// TableName specifies the table name for Asset
func (Asset) TableName() string {
	return "assets"
}
