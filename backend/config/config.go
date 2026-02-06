package config

import (
	"os"
)

// Config holds application configuration
type Config struct {
	DBDriver   string
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBDSN      string
	Port       string
}

// Load loads configuration from environment variables
func Load() *Config {
	return &Config{
		DBDriver:   getEnv("DB_DRIVER", "sqlite"),
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "payments"),
		DBDSN:      getEnv("DB_DSN", ""),
		Port:       getEnv("PORT", "8080"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
