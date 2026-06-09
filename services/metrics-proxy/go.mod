module github.com/swiss-subnet/ssn-console/services/metrics-proxy

go 1.25.5

require (
	github.com/aviate-labs/agent-go v0.8.3
	github.com/swiss-subnet/ssn-console/services/httpsvc v0.0.0-00010101000000-000000000000
)

require (
	github.com/0x51-dev/upeg v0.1.5 // indirect
	github.com/bits-and-blooms/bitset v1.20.0 // indirect
	github.com/consensys/bavard v0.1.27 // indirect
	github.com/consensys/gnark-crypto v0.15.0 // indirect
	github.com/fxamacker/cbor/v2 v2.7.0 // indirect
	github.com/mmcloughlin/addchain v0.4.0 // indirect
	github.com/x448/float16 v0.8.4 // indirect
	golang.org/x/sys v0.44.0 // indirect
	google.golang.org/protobuf v1.36.11 // indirect
	rsc.io/tmplfunc v0.0.3 // indirect
)

replace github.com/swiss-subnet/ssn-console/services/httpsvc => ../httpsvc
