package main

import (
	"log"
	"net/http"

	"backend/database"
	"backend/handlers"
	"backend/jwtLogic"
	"backend/scheduler"

	"github.com/gorilla/mux"
	"github.com/rs/cors"

	"github.com/joho/godotenv"
)

func main() {

	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env")
	}

	go scheduler.JobWatcher()
	// Initialize database
	if err := database.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Setup router
	router := mux.NewRouter()
	

	router.HandleFunc("/generate-token", jwtLogic.GenerateToken).Methods("POST")
	// User routes
	router.Handle("/users/{userAddress}", handlers.JWTAuth(http.HandlerFunc(handlers.GetUserByAddress))).Methods("GET")

	// Payment template routes
	router.Handle("/templates/{userAddress}", handlers.JWTAuth(http.HandlerFunc(handlers.GetUserTemplates))).Methods("GET")
	router.Handle("/templates/{userAddress}", handlers.JWTAuth(http.HandlerFunc(handlers.CreateUserTemplate))).Methods("POST")
	router.Handle("/templates/{templateId}", handlers.JWTAuth(http.HandlerFunc(handlers.DeleteTemplate))).Methods("DELETE")
	router.Handle("/templates/{templateId}", handlers.JWTAuth(http.HandlerFunc(handlers.UpdateTemplate))).Methods("PUT")


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