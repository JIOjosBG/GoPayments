package handlers

import (
	"context"
	"net/http"

	"github.com/golang-jwt/jwt/v5"

	"backend/jwtLogic"
)



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
			return jwtLogic.JwtKey, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}
		
		claims := token.Claims.(jwt.MapClaims)
		address, ok := claims["userAddress"].(string)
		if !ok {
			http.Error(w, "invalid token claims", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), jwtLogic.UserContextKey, address)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
