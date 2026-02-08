package database

import (
	"fmt"
	"log"

	"backend/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDB initializes the database connection using MySQL only.
func InitDB() error {
	var err error
	var dialector gorm.Dialector

	// You can move these credentials to environment variables or config files.
	mysqlDSN := "gouser:gouserpass@tcp(127.0.0.1:3306)/paymentProcessor?charset=utf8mb4&parseTime=True&loc=Local"

	dialector = mysql.Open(mysqlDSN)

	DB, err = gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("Database connection established")

	// Auto migrate all models
	if err := AutoMigrate(); err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}

	return nil
}

// AutoMigrate runs migrations for all models
func AutoMigrate() error {
	return DB.AutoMigrate(
		&models.User{},
		&models.Asset{},
		&models.PaymentTemplate{},
		&models.Transfer{},
		// Add more models here as you create them
	)
}

// CloseDB closes the database connection
func CloseDB() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
