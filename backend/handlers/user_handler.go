package handlers

import (
	"encoding/json"
	"net/http"

	"backend/database"
	"backend/models"
	"backend/jwtLogic"

	"github.com/gorilla/mux"
	"gorm.io/gorm"

	"strings"
	"fmt"
)

// GetUserByAddress handles GET /users/{userAddress}
func GetUserByAddress(w http.ResponseWriter, r *http.Request) {
	userAddressFromCookie := r.Context().Value(jwtLogic.UserContextKey).(string)
	vars := mux.Vars(r)
	userAddress := vars["userAddress"]

	if userAddress == "" {
		http.Error(w, "User address is required", http.StatusBadRequest)
		return
	}

	if !strings.EqualFold(userAddressFromCookie, userAddress) {
		http.Error(w, "signature does not match address", http.StatusUnauthorized)
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
	userAddressFromCookie := r.Context().Value(jwtLogic.UserContextKey).(string)
	vars := mux.Vars(r)
	userAddress := vars["userAddress"]

	if userAddress == "" {
		http.Error(w, "User address is required", http.StatusBadRequest)
		return
	}

	if !strings.EqualFold(userAddressFromCookie, userAddress) {
		http.Error(w, "signature does not match address", http.StatusUnauthorized)
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
