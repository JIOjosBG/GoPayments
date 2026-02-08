package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"backend/database"
	"backend/jwtLogic"
	"backend/models"
	"backend/scheduler"

	"github.com/gorilla/mux"
	"gorm.io/gorm"

	"strings"
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
		http.Error(w, "wrong cookie", http.StatusUnauthorized)
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
		http.Error(w, "wrong cookie", http.StatusUnauthorized)
		return
	}


	// Find the user by Ethereum address and preload payment templates and transfers inside them
	var user models.User
	result := database.DB.
		Preload("PaymentTemplates.Transfers").
		Preload("PaymentTemplates.Transfers.SourceUser").
		Preload("PaymentTemplates.Transfers.Asset").
		Preload("PaymentTemplates.User").
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


func CreateUserTemplate(w http.ResponseWriter, r *http.Request) {
	userAddressFromCookie := r.Context().Value(jwtLogic.UserContextKey).(string)
	vars := mux.Vars(r)
	userAddress := vars["userAddress"]

	type TypeOfBatch string

	const (
		TypeNow       TypeOfBatch = "NOW"
		TypeSchedule  TypeOfBatch = "SCHEDULE"
		TypeRecurring TypeOfBatch = "RECURRING"
	)

	type AssetInput struct {
		ID             uint      `json:"id"`                       // Asset DB ID
		CreatedAt      time.Time `json:"created_at"`               // Asset creation time
		Symbol         string    `json:"symbol"`                   // Asset symbol
		Name           string    `json:"name"`                     // Asset name
		Decimals       uint8     `json:"decimals"`                 // Asset decimals
		ContractAddress string   `json:"contract_address,omitempty"` // ERC-20 contract address
		ChainID        uint64    `json:"chain_id"`                 // Blockchain chain ID
	}

	type TransferInput struct {
		Amount      float64     `json:"amount"`               // Transfer amount
		Destination string      `json:"destination"`          // Destination Ethereum address
		Asset       AssetInput  `json:"asset"`                // Asset info
	}

	type CreateTemplateRequest struct {
		UserAddress string           `json:"userAddress"`        // Ethereum address of the user
		ChainID     uint64           `json:"chainId"`            // Blockchain network ID
		Type        TypeOfBatch           `json:"type"`               // Payment type, e.g., "NOW"
		Transfers   []TransferInput  `json:"transfers"`          // List of transfers
		ScheduledAt   int64  `json:"scheduledAt"`          // List of transfers
		RecurringInterval	int64 	`json:"timeInterval"`

	}

	var req CreateTemplateRequest;

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	
	if userAddress == "" {
		http.Error(w, "User address is required", http.StatusBadRequest)
		return
	}

	if !strings.EqualFold(userAddressFromCookie, userAddress) {
		http.Error(w, "wrong cookie", http.StatusUnauthorized)
		return
	}

	var user models.User
	result := database.DB.Where("ethereum_address = ?", userAddress).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// start creating the record itself
	var template models.PaymentTemplate
	switch req.Type {
	case TypeNow:
		name := "Payment"	
		template = models.PaymentTemplate{
			UserID: user.ID,
			Name:   name, 
			IsCancelled: false,
		}
	case TypeSchedule:
		name := "Scheduled Payment"
		t := time.Unix(req.ScheduledAt/1000,0)
		template = models.PaymentTemplate{
			UserID: user.ID,
			Name:   name, 
			IsCancelled: false,
			ScheduledAt: &t,
		}
	case TypeRecurring:
		name := "Recurring Payment"
		t := time.Unix(req.ScheduledAt/1000,0)
		interval := req.RecurringInterval/1000
		template = models.PaymentTemplate{
			UserID: user.ID,
			Name:   name, 
			IsCancelled: false,
			ScheduledAt: &t,
			RecurringInterval: &interval,
		}
	}

	var transfers []models.Transfer
	for _, t := range req.Transfers {
		var asset models.Asset
		if err := database.DB.First(&asset, t.Asset.ID).Error; err != nil {
			http.Error(w, "Asset not found", http.StatusBadRequest)
			return
		}

		transfers = append(transfers, models.Transfer{
			SourceUserID:      user.ID,
			DestinationUserAddress:	t.Destination,
			Amount:            t.Amount,
			AssetID:           asset.ID,
			Status:            models.TransferStatusPending,
			Asset:             asset,
		})
	}

	// Attach transfers to template
	template.Transfers = transfers
	

	newRecord := database.DB.Create(&template)
	if newRecord.Error != nil {
		http.Error(w, "Asset not found", http.StatusInternalServerError)
		return
	}

	switch req.Type{
	case TypeSchedule:
		scheduler.JobsChan <- scheduler.Job{RunAt: time.Unix(req.ScheduledAt/1000, 0), TemplateId: template.ID}
	case TypeRecurring:
		scheduler.JobsChan <- scheduler.Job{RunAt: time.Unix(req.ScheduledAt/1000, 0), TemplateId: template.ID}
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
	})
}
