package main

import (
	"flag"
	"fmt"
	"log"
	"time"

	"backend/database"
	"backend/models"
)

func main() {
	// Parse command-line flags
	cleanFlag := flag.Bool("clean", false, "Clean database before seeding")
	cleanOnlyFlag := flag.Bool("clean-only", false, "Only clean database, do not seed")
	flag.Parse()

	// Initialize database
	if err := database.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer func() {
		if err := database.CloseDB(); err != nil {
			log.Println("DB close error:", err)
		}
	}()
	// Clean database if requested
	if *cleanFlag || *cleanOnlyFlag {
		log.Println("Cleaning database...")
		if err := cleanDatabase(); err != nil {
			log.Fatalf("Failed to clean database: %v", err)
		}
		log.Println("Database cleaned successfully!")

		if *cleanOnlyFlag {
			return // Exit after cleaning
		}
	}

	log.Println("Starting database seeding...")

	// Seed assets
	assets, err := seedAssets()
	if err != nil {
		log.Fatalf("Failed to seed assets: %v", err)
	}
	log.Printf("Created %d assets", len(assets))

	// Seed user 1 (Jo)
	user1, err := seedUser(
		"0x6969174FD72466430a46e18234D0b530c9FD5f49",
		"jo@example.com",
		"jo",
	)
	if err != nil {
		log.Fatalf("Failed to seed user1: %v", err)
	}
	log.Printf("Created user1: %s", user1.EthereumAddress)

	// Seed user 2 (Alex)
	user2, err := seedUser(
		"0x1234567890abcdef1234567890abcdef12345678",
		"alex@example.com",
		"alex",
	)
	if err != nil {
		log.Fatalf("Failed to seed user2: %v", err)
	}
	log.Printf("Created user2: %s", user2.EthereumAddress)

	// Seed payment template for user1
	template, err := seedPaymentTemplate(user1.ID, assets[0].ID)
	if err != nil {
		log.Fatalf("Failed to seed payment template: %v", err)
	}
	log.Printf("Created payment template: %s", template.Name)

	// Seed transfers from user1 to user2
	transfers, err := seedTransfers(user1.ID, user2.EthereumAddress, template.ID, assets)
	if err != nil {
		log.Fatalf("Failed to seed transfers: %v", err)
	}
	log.Printf("Created %d transfers", len(transfers))

	log.Println("Database seeding completed successfully!")
}

func seedAssets() ([]models.Asset, error) {
	assets := []models.Asset{
		{
			Symbol:          "USDC",
			Name:            "USD Coin",
			Decimals:        6,
			ContractAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
			ChainID:         8453,
		},
		{
			Symbol:          "ETH",
			Name:            "Ethereum",
			Decimals:        18,
			ContractAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
			ChainID:         8453,
		},
		{
			Symbol:          "EURC",
			Name:            "Euro Coin",
			Decimals:        6,
			ContractAddress: "0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42",
			ChainID:         8453,
		},
	}

	for i := range assets {
		// Check if asset already exists
		var existing models.Asset
		result := database.DB.Where("symbol = ?", assets[i].Symbol).First(&existing)
		if result.Error == nil {
			log.Printf("Asset %s already exists, skipping", assets[i].Symbol)
			assets[i] = existing
			continue
		}

		if err := database.DB.Create(&assets[i]).Error; err != nil {
			return nil, fmt.Errorf("failed to create asset %s: %w", assets[i].Symbol, err)
		}
	}

	return assets, nil
}

// Modified seedUser function to allow details for different users
func seedUser(ethAddress string, email string, username string) (*models.User, error) {
	user := models.User{
		EthereumAddress: ethAddress,
		Email:           stringPtr(email),
		Username:        stringPtr(username),
	}

	// Check if user already exists
	var existing models.User
	result := database.DB.Where("ethereum_address = ?", user.EthereumAddress).First(&existing)
	if result.Error == nil {
		log.Printf("User %s already exists, using existing", user.EthereumAddress)
		return &existing, nil
	}

	if err := database.DB.Create(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &user, nil
}

func seedPaymentTemplate(userID uint, assetID uint) (*models.PaymentTemplate, error) {
	now := time.Now()
	tomorrow := now.Add(24 * time.Hour)
	oneDay := int64(86400) // 1 day in seconds

	template := models.PaymentTemplate{
		UserID:            userID,
		Name:              "Monthly Recurring Payment",
		IsCancelled:       false,
		ScheduledAt:       &tomorrow,
		RecurringInterval: &oneDay,
	}

	// Check if template already exists for this user
	var existing models.PaymentTemplate
	result := database.DB.Where("user_id = ? AND name = ?", userID, template.Name).First(&existing)
	if result.Error == nil {
		log.Printf("Payment template '%s' already exists, using existing", template.Name)
		return &existing, nil
	}

	if err := database.DB.Create(&template).Error; err != nil {
		return nil, fmt.Errorf("failed to create payment template: %w", err)
	}

	return &template, nil
}

// Now from user1 (source) to user2 (destination)
func seedTransfers(sourceUserID uint, DestinationUserAddress string, templateID uint, assets []models.Asset) ([]models.Transfer, error) {
	transfers := []models.Transfer{
		{
			SourceUserID:           sourceUserID,
			DestinationUserAddress: DestinationUserAddress,
			PaymentTemplateID:      &templateID,
			Amount:                 100.50,
			AssetID:                assets[0].ID, // USDC
			Status:                 models.TransferStatusCompleted,
		},
		{
			SourceUserID:           sourceUserID,
			DestinationUserAddress: DestinationUserAddress,
			PaymentTemplateID:      &templateID,
			Amount:                 0.5,
			AssetID:                assets[1].ID, // ETH
			Status:                 models.TransferStatusPending,
		},
		{
			SourceUserID:           sourceUserID,
			DestinationUserAddress: DestinationUserAddress,
			PaymentTemplateID:      &templateID,
			Amount:                 250.75,
			AssetID:                assets[2].ID, // EURC
			Status:                 models.TransferStatusPending,
		},
	}

	// Generate unique references for each transfer
	for i := range transfers {
		transfers[i].CreatedAt = time.Now().Add(time.Duration(-i) * time.Hour) // Stagger creation times
		if err := database.DB.Create(&transfers[i]).Error; err != nil {
			return nil, fmt.Errorf("failed to create transfer %d: %w", i+1, err)
		}
	}

	return transfers, nil
}

// cleanDatabase deletes all records from the database in reverse dependency order
// to respect foreign key constraints. Uses Unscoped() to permanently delete soft-deleted records.
func cleanDatabase() error {
	// Delete in reverse dependency order:
	// 1. Transfers (depends on Users, PaymentTemplates, Assets)
	// 2. PaymentTemplates (depends on Users)
	// 3. Users (no dependencies)
	// 4. Assets (optional - usually kept as reference data)

	// Delete transfers first (hard delete, bypass soft delete)
	result := database.DB.Unscoped().Where("1 = 1").Delete(&models.Transfer{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete transfers: %w", result.Error)
	}
	log.Printf("Deleted %d transfers", result.RowsAffected)

	// Delete payment templates (hard delete, bypass soft delete)
	result = database.DB.Unscoped().Where("1 = 1").Delete(&models.PaymentTemplate{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete payment templates: %w", result.Error)
	}
	log.Printf("Deleted %d payment templates", result.RowsAffected)

	// Delete users
	result = database.DB.Where("1 = 1").Delete(&models.User{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete users: %w", result.Error)
	}
	log.Printf("Deleted %d users", result.RowsAffected)

	// Assets are typically reference data and kept, but uncomment to delete them too:
	// result = database.DB.Where("1 = 1").Delete(&models.Asset{})
	// if result.Error != nil {
	// 	return fmt.Errorf("failed to delete assets: %w", result.Error)
	// }
	// log.Printf("Deleted %d assets", result.RowsAffected)

	return nil
}

// Helper function to create string pointers
func stringPtr(s string) *string {
	return &s
}
