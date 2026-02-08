package handlers

import (
	"encoding/json"
	"net/http"

	"backend/database"
	"backend/models"
)

// GetAllAssets handles GET /assets
func GetAllAssets(w http.ResponseWriter, r *http.Request) {
	var assets []models.Asset
	result := database.DB.Find(&assets)

	if result.Error != nil {
		http.Error(w, "Error fetching assets", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(assets)
}
