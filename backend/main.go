package main

import (
	"fmt"
	"log"
	"net/http"

	"backend/database"
	"backend/handlers"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	// Initialize database
	if err := database.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Setup router
	router := mux.NewRouter()
	
	router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello, World!")
	}).Methods("GET")

	// User routes
	router.HandleFunc("/users/{userAddress}", handlers.GetUserByAddress).Methods("GET")

	// Payment template routes
	router.HandleFunc("/templates/{userAddress}", handlers.GetUserTemplates).Methods("GET")

	// Asset routes
	router.HandleFunc("/assets", handlers.GetAllAssets).Methods("GET")

	// Configure CORS
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost:3000", "http://localhost:3001"}, // Add your frontend URLs
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders: []string{"Link"},
		AllowCredentials: true,
		MaxAge: 300, // Maximum value not ignored by any of major browsers
	})

	// Wrap the router with CORS middleware
	handler := c.Handler(router)

	log.Println("Server starting on :8080")
	if err := http.ListenAndServe(":8080", handler); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}