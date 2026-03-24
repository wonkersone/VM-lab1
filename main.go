package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
)

type SolvationRequest struct {
	Matrix [][]float64 `json:"matrix"`
	B      []float64   `json:"b"`
	Eps    float64     `json:"eps"`
}

type ResultRow struct {
	Index int     `json:"index"`
	X     float64 `json:"x"`
	Error float64 `json:"error"`
}

type SolvationResponse struct {
	Rows       []ResultRow `json:"rows"`
	Iterations int         `json:"iterations"`
	Norm       float64     `json:"norm"`
	ErrorLog   string      `json:"error_log"`
}

func solveHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Метод не поддерживается", http.StatusMethodNotAllowed)
		return
	}

	var req SolvationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Ошибка парсинга JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	solver := NewSolver(req.Matrix, req.B, req.Eps)
	result := solver.Solve()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func loadConfig(path string) map[string]string {
	config := make(map[string]string)
	file, err := os.Open(path)
	if err != nil {
		fmt.Println("Конфигурационный файл не найден, используются значения по умолчанию")
		return config
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.TrimSpace(line) == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			config[strings.TrimSpace(parts[0])] = strings.TrimSpace(parts[1])
		}
	}
	return config
}

func main() {
	config := loadConfig("config.txt")
	port := config["PORT"]
	staticDir := config["STATIC_DIR"]
	http.Handle("/", http.FileServer(http.Dir(staticDir)))
	http.HandleFunc("/solve", solveHandler)
	fmt.Printf("Сервер запущен: http://localhost:%s\n", port)
	err := http.ListenAndServe(":"+port, nil)
	if err != nil {
		fmt.Println("Ошибка старта сервера:", err)
	}
}
