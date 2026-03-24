package main

import (
	"math"
)

type IterativeSolver struct {
	Matrix [][]float64
	B      []float64
	Eps    float64
	N      int
}

func NewSolver(matrix [][]float64, b []float64, eps float64) *IterativeSolver {
	return &IterativeSolver{
		Matrix: matrix,
		B:      b,
		Eps:    eps,
		N:      len(matrix),
	}
}

func (s *IterativeSolver) CheckAndFixDominance() bool {
	n := s.N
	if n == 1 {
		return math.Abs(s.Matrix[0][0]) > 1e-25
	}

	p := make([]int, n)
	for i := range p {
		p[i] = -1
	}
	used := make([]bool, n)

	var findPermutation func(row int) bool
	findPermutation = func(row int) bool {
		if row == n {
			return true
		}
		for i := 0; i < n; i++ {
			if !used[i] {
				sum := 0.0
				for j := 0; j < n; j++ {
					sum += math.Abs(s.Matrix[i][j])
				}
				diag := math.Abs(s.Matrix[i][row])
				if diag >= sum-diag && diag > 1e-25 {
					p[row] = i
					used[i] = true
					if findPermutation(row + 1) {
						return true
					}
					used[i] = false
				}
			}
		}
		return false
	}

	if findPermutation(0) {
		newMatrix := make([][]float64, n)
		newB := make([]float64, n)
		for i := 0; i < n; i++ {
			newMatrix[i] = s.Matrix[p[i]]
			newB[i] = s.B[p[i]]
		}
		s.Matrix = newMatrix
		s.B = newB
		return true
	}
	return false
}

func (s *IterativeSolver) Solve() SolvationResponse {
	if !s.CheckAndFixDominance() {
		return SolvationResponse{ErrorLog: "Не удалось достичь диагонального преобладания."}
	}

	n := s.N
	x := make([]float64, n)
	xPrev := make([]float64, n)

	var norm float64
	for i := 0; i < n; i++ {
		rowSum := 0.0
		for j := 0; j < n; j++ {
			if i != j {
				rowSum += math.Abs(s.Matrix[i][j] / s.Matrix[i][i])
			}
		}
		if rowSum > norm {
			norm = rowSum
		}
	}

	iters := 0
	maxIters := 10000
	for iters < maxIters {
		iters++
		copy(xPrev, x)
		maxDiff := 0.0

		for i := 0; i < n; i++ {
			sum := 0.0
			for j := 0; j < n; j++ {
				if i != j {
					sum += s.Matrix[i][j] * xPrev[j]
				}
			}
			x[i] = (s.B[i] - sum) / s.Matrix[i][i]

			if math.IsInf(x[i], 0) || math.IsNaN(x[i]) {
				return SolvationResponse{ErrorLog: "Метод расходится (Infinity/NaN)."}
			}

			diff := math.Abs(x[i] - xPrev[i])
			if diff > maxDiff {
				maxDiff = diff
			}
		}

		if maxDiff <= s.Eps {
			break
		}
	}

	rows := make([]ResultRow, n)
	for i := 0; i < n; i++ {
		rows[i] = ResultRow{
			Index: i + 1,
			X:     x[i],
			Error: math.Abs(x[i] - xPrev[i]),
		}
	}

	return SolvationResponse{Rows: rows, Iterations: iters, Norm: norm}
}
