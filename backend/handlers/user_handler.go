package handlers

import (
	"encoding/json"
	"net/http"

	"backend/database"
	"backend/models"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

// GetUserByAddress handles GET /users/{userAddress}
func GetUserByAddress(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userAddress := vars["userAddress"]

	if userAddress == "" {
		http.Error(w, "User address is required", http.StatusBadRequest)
		return
	}

	var user models.User
	result := database.DB.Where("ethereum_address = ?", userAddress).First(&user)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Error fetching user", http.StatusInternalServerError)
		return
	}

	// Remove email from response for privacy
	user.Email = nil

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// GetUserTemplates handles GET /templates/{userAddress}
func GetUserTemplates(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userAddress := vars["userAddress"]

	if userAddress == "" {
		http.Error(w, "User address is required", http.StatusBadRequest)
		return
	}

	// Find the user by Ethereum address and preload payment templates and transfers inside them
	var user models.User
	result := database.DB.
		Preload("PaymentTemplates.Transfers").
		Preload("PaymentTemplates.Transfers.SourceUser").
		Preload("PaymentTemplates.Transfers.DestinationUser").
		Preload("PaymentTemplates.Transfers.Asset").
		Where("ethereum_address = ?", userAddress).
		First(&user)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Error fetching user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user.PaymentTemplates)
}
