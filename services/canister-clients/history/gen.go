// Package history holds the goic-generated typed client for the
// canister-history canister. canister_history_gen.go is generated from the
// tracked candid interface and is NOT committed (see .gitignore); drift from
// the .did surfaces as a compile error in the modules that use it. Run
// `go generate ./...` (or any of the services:: recipes, which generate first)
// to (re)produce it.
package history

//go:generate go run github.com/aviate-labs/agent-go/cmd/goic@v0.9.2-0.20260622113417-a63c3f62ea24 generate did ../../../src/canister-history-api/canister_history.did canisterHistory --output=canister_history_gen.go --packageName=history
