package jwtLogic

import (
	"backend/database"
	"backend/models"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

// @TODO change
var JwtKey = []byte("TODO_CHANGE_SECRET")

const UserContextKey string = "userAddress"

// GenerateToken sets the JWT in an HTTP-only cookie
func GenerateToken(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserAddress string `json:"userAddress"`
		Message     string `json:"message"`
		Signature   string `json:"signature"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.UserAddress == "" || req.Message == "" || req.Signature == "" {
		http.Error(w, "missing fields", http.StatusBadRequest)
		return
	}

	// @TODO check timestamp of the message
	msg := []byte("\x19Ethereum Signed Message:\n" + 
	strconv.Itoa(len(req.Message)) + req.Message)
	
	hash := crypto.Keccak256Hash(msg)

	sig := common.FromHex(req.Signature)
	if len(sig) != 65 {
		http.Error(w, "invalid signature length", http.StatusBadRequest)
		return
	}

	if sig[64] >= 27 {
		sig[64] -= 27
	}

	pubKey, err := crypto.SigToPub(hash.Bytes(), sig)
	if err != nil {
		http.Error(w, "invalid signature", http.StatusUnauthorized)
		return
	}

	recoveredAddr := crypto.PubkeyToAddress(*pubKey)
	if !strings.EqualFold(recoveredAddr.Hex(), req.UserAddress) {
		http.Error(w, "signature does not match address", http.StatusUnauthorized)
		return
	}
	
	claims := jwt.MapClaims{
		"userAddress": req.UserAddress,
		"exp":         time.Now().Add(15 * time.Minute).Unix(),
	}

	var existingUser models.User
	err = database.DB.Where("ethereum_address = ?", req.UserAddress).First(&existingUser).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		user := models.User{
			EthereumAddress: req.UserAddress,
			CreatedAt:       time.Now(),
		}
		if err := database.DB.Create(&user).Error; err != nil {
			http.Error(w, "could not create user", http.StatusInternalServerError)
			return
		}
	} else if err != nil {
		http.Error(w, "database error", http.StatusInternalServerError)
		return
	}


	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString(JwtKey)
	if err != nil {
		http.Error(w, "could not generate token", http.StatusInternalServerError)
		return
	}

	// Set HTTP-only cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    tokenStr,
		Path:     "/",
		Expires:  time.Now().Add(15 * time.Minute),
		// Secure:   true,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})


	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Write([]byte("token set in cookie"))
}