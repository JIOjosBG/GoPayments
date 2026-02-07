package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

// @TODO change
var jwtKey = []byte("TODO_CHANGE_SECRET")

const UserContextKey string = "user"

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

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString(jwtKey)
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

// JWTAuth reads the token from the HTTP-only cookie
func JWTAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("token")
		if err != nil {
			http.Error(w, "missing token", http.StatusUnauthorized)
			return
		}

		token, err := jwt.Parse(cookie.Value, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return jwtKey, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), UserContextKey, token.Claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
