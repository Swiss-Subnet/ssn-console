// Package cyclesmonitor holds the goic-generated typed client for the
// cycles-monitor canister. cyclesmonitor_gen.go is generated from the tracked
// candid interface and is NOT committed (see .gitignore); drift from the .did
// surfaces as a compile error in the modules that use it. Run
// `go generate ./...` (or any of the services:: recipes, which generate first)
// to (re)produce it.
package cyclesmonitor

//go:generate go run github.com/aviate-labs/agent-go/cmd/goic@v0.9.2-0.20260622113417-a63c3f62ea24 generate did ../../../src/cycles-monitor-api/cycles_monitor.did cyclesmonitor --output=cyclesmonitor_gen.go --packageName=cyclesmonitor
